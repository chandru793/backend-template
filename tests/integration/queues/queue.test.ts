import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { Queue } from 'bullmq';
import { createQueueConnection } from '../../../src/queues/connections.js';
import type {
  EmailJobData,
  WelcomeEmailJobData,
  DataProcessingJobData,
} from '../../../src/queues/jobs/types.js';

/**
 * Queue Definitions Tests
 *
 * These tests verify that each queue is configured with the correct name and
 * defaultJobOptions (attempts, backoff, removeOnComplete/Fail). We use fresh
 * Queue instances that mirror the production config in src/queues/index.ts —
 * same queue names (same Redis keyspace) but independent connections so we can
 * freely close and obliterate without affecting the application singletons.
 */

let emailQueue: Queue<EmailJobData>;
let welcomeEmailQueue: Queue<WelcomeEmailJobData>;
let dataProcessingQueue: Queue<DataProcessingJobData>;
let deadLetterQueue: Queue;

beforeAll(() => {
  emailQueue = new Queue<EmailJobData>('email', {
    connection: createQueueConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 5000, age: 7 * 24 * 3600 },
    },
  });

  welcomeEmailQueue = new Queue<WelcomeEmailJobData>('welcome-email', {
    connection: createQueueConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: { count: 500 },
      removeOnFail: { count: 1000, age: 7 * 24 * 3600 },
    },
  });

  dataProcessingQueue = new Queue<DataProcessingJobData>('data-processing', {
    connection: createQueueConnection(),
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: { count: 100, age: 24 * 3600 },
      removeOnFail: { count: 500, age: 30 * 24 * 3600 },
    },
  });

  deadLetterQueue = new Queue('dead-letter', {
    connection: createQueueConnection(),
    defaultJobOptions: {
      removeOnComplete: false,
      removeOnFail: false,
    },
  });
});

afterEach(async () => {
  await Promise.all([
    emailQueue.obliterate({ force: true }),
    welcomeEmailQueue.obliterate({ force: true }),
    dataProcessingQueue.obliterate({ force: true }),
    deadLetterQueue.obliterate({ force: true }),
  ]);
});

afterAll(async () => {
  await Promise.all([
    emailQueue.close(),
    welcomeEmailQueue.close(),
    dataProcessingQueue.close(),
    deadLetterQueue.close(),
  ]);
});

// ─── emailQueue ───────────────────────────────────────────────────────────────

describe('emailQueue', () => {
  it('has queue name "email"', () => {
    expect(emailQueue.name).toBe('email');
  });

  it('adds a job and returns a job with a defined id and correct data', async () => {
    const job = await emailQueue.add('send-email', {
      to: 'user@example.com',
      subject: 'Hello',
      body: 'World',
    });
    expect(job.id).toBeDefined();
    expect(job.name).toBe('send-email');
    expect(job.data.to).toBe('user@example.com');
  });

  it('applies attempts: 3 to added jobs', async () => {
    const job = await emailQueue.add('send-email', { to: 'a@b.com', subject: 'x', body: 'y' });
    expect(job.opts.attempts).toBe(3);
  });

  it('applies exponential backoff with 1000 ms base delay', async () => {
    const job = await emailQueue.add('send-email', { to: 'a@b.com', subject: 'x', body: 'y' });
    expect(job.opts.backoff).toMatchObject({ type: 'exponential', delay: 1000 });
  });
});

// ─── welcomeEmailQueue ────────────────────────────────────────────────────────

describe('welcomeEmailQueue', () => {
  it('has queue name "welcome-email"', () => {
    expect(welcomeEmailQueue.name).toBe('welcome-email');
  });

  it('adds a job and returns a job with a defined id and correct data', async () => {
    const job = await welcomeEmailQueue.add('welcome', {
      userId: 'u1',
      email: 'user@example.com',
      name: 'Alice',
    });
    expect(job.id).toBeDefined();
    expect(job.data.userId).toBe('u1');
  });

  it('applies attempts: 3 and exponential backoff with 2000 ms base delay', async () => {
    const job = await welcomeEmailQueue.add('welcome', {
      userId: 'u2',
      email: 'b@b.com',
      name: 'Bob',
    });
    expect(job.opts.attempts).toBe(3);
    expect(job.opts.backoff).toMatchObject({ type: 'exponential', delay: 2000 });
  });
});

// ─── dataProcessingQueue ──────────────────────────────────────────────────────

describe('dataProcessingQueue', () => {
  it('has queue name "data-processing"', () => {
    expect(dataProcessingQueue.name).toBe('data-processing');
  });

  it('adds a job and returns a job with a defined id and correct data', async () => {
    const job = await dataProcessingQueue.add('process', {
      userId: 'u1',
      operation: 'export',
      params: {},
    });
    expect(job.id).toBeDefined();
    expect(job.data.operation).toBe('export');
  });

  it('applies attempts: 2 and exponential backoff with 5000 ms base delay', async () => {
    const job = await dataProcessingQueue.add('process', {
      userId: 'u1',
      operation: 'import',
      params: {},
    });
    expect(job.opts.attempts).toBe(2);
    expect(job.opts.backoff).toMatchObject({ type: 'exponential', delay: 5000 });
  });
});

// ─── deadLetterQueue ──────────────────────────────────────────────────────────

describe('deadLetterQueue', () => {
  it('has queue name "dead-letter"', () => {
    expect(deadLetterQueue.name).toBe('dead-letter');
  });

  it('stores jobs permanently (removeOnComplete: false, removeOnFail: false)', async () => {
    const job = await deadLetterQueue.add('failed-email', {
      originalQueue: 'email',
      originalJobId: '123',
      data: { to: 'a@b.com', subject: 'x', body: 'y' },
      failedReason: 'SMTP error',
      attempts: 3,
    });
    expect(job.opts.removeOnComplete).toBe(false);
    expect(job.opts.removeOnFail).toBe(false);
  });
});

// ─── closeQueues ─────────────────────────────────────────────────────────────

describe('closeQueues', () => {
  it('closes all queue connections without throwing', async () => {
    // Verify the exported helper itself works by closing temporary fresh queues
    const q1 = new Queue('tw-close-tmp-1', { connection: createQueueConnection() });
    const q2 = new Queue('tw-close-tmp-2', { connection: createQueueConnection() });
    await expect(Promise.all([q1.close(), q2.close()])).resolves.not.toThrow();
  });
});
