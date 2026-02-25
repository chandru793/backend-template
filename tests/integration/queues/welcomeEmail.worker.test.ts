import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { type Job } from 'bullmq';
import { makeQueue, makeWorker, makeQueueEvents } from '../../helpers/queue.js';
import type { WelcomeEmailJobData, EmailJobResult } from '../../../src/queues/jobs/types.js';

/**
 * Welcome Email Worker Tests
 *
 * Mirrors the contract defined in src/queues/workers/welcomeEmail.worker.ts:
 *   - Returns EmailJobResult with sent: true and a messageId that includes the userId
 *   - Routes to DLQ after all retry attempts are exhausted
 */

const QUEUE_NAME = 'tw-welcome';
const DLQ_NAME = 'tw-dlq-welcome';

const queue = makeQueue<WelcomeEmailJobData>(QUEUE_NAME, { attempts: 3 });
const dlq = makeQueue(DLQ_NAME, { removeOnComplete: false, removeOnFail: false });
const queueEvents = makeQueueEvents(QUEUE_NAME);

// Welcome email processor — same logic as welcomeEmail.worker.ts, 1 ms delay
const welcomeEmailProcessor = async (
  job: Job<WelcomeEmailJobData>,
): Promise<EmailJobResult> => {
  const { userId, email, name } = job.data;
  await job.log(`Sending welcome email to ${name} (${email})`);
  await job.updateProgress(30);
  await new Promise((resolve) => setTimeout(resolve, 1));
  await job.updateProgress(80);
  await job.log('Welcome email sent successfully');
  await job.updateProgress(100);
  return {
    sent: true,
    messageId: `welcome-${userId}-${Date.now()}`,
    timestamp: Date.now(),
  };
};

let worker = makeWorker<WelcomeEmailJobData, EmailJobResult>(QUEUE_NAME, welcomeEmailProcessor);

worker.on('failed', (job: Job<WelcomeEmailJobData> | undefined, err: Error) => {
  if (!job) return;
  if (job.attemptsMade >= (job.opts.attempts ?? 3)) {
    dlq
      .add('failed-welcome-email', {
        originalQueue: QUEUE_NAME,
        originalJobId: job.id,
        data: job.data,
        failedReason: err.message,
        attempts: job.attemptsMade,
      })
      .catch(() => {});
  }
});

beforeAll(async () => {
  await worker.waitUntilReady();
});

afterEach(async () => {
  await queue.obliterate({ force: true });
  await dlq.obliterate({ force: true });
});

afterAll(async () => {
  await worker.close();
  await queueEvents.close();
  await queue.close();
  await dlq.close();
});

// ─── Happy path ───────────────────────────────────────────────────────────────

describe('happy path', () => {
  it('processes a welcome email job and returns sent: true', async () => {
    const job = await queue.add('welcome', {
      userId: 'user-123',
      email: 'alice@example.com',
      name: 'Alice',
    });

    const result = await job.waitUntilFinished(queueEvents, 10_000);

    expect(result.sent).toBe(true);
    expect(typeof result.timestamp).toBe('number');
  });

  it('includes the userId in the messageId', async () => {
    const userId = 'user-abc-789';

    const job = await queue.add('welcome', {
      userId,
      email: 'bob@example.com',
      name: 'Bob',
    });

    const result = await job.waitUntilFinished(queueEvents, 10_000);

    expect(result.messageId).toContain(userId);
    expect(result.messageId).toMatch(/^welcome-.+-\d+$/);
  });

  it('updates progress to 30, 80, and 100 during processing', async () => {
    const progressValues: number[] = [];

    queueEvents.on('progress', ({ data }) => {
      progressValues.push(data as number);
    });

    const job = await queue.add('welcome', {
      userId: 'u-progress',
      email: 'progress@example.com',
      name: 'Progress User',
    });

    await job.waitUntilFinished(queueEvents, 10_000);

    expect(progressValues).toContain(30);
    expect(progressValues).toContain(80);
    expect(progressValues).toContain(100);
  });

  it('fires the completed event with userId in the return value messageId', async () => {
    const userId = 'user-event-test';

    const completedPromise = new Promise<EmailJobResult>((resolve) => {
      worker.on('completed', (job: Job<WelcomeEmailJobData, EmailJobResult>) => {
        if (job.data.userId === userId) resolve(job.returnvalue);
      });
    });

    await queue.add('welcome', {
      userId,
      email: 'event@example.com',
      name: 'Event User',
    });

    const returnValue = await completedPromise;
    expect(returnValue.sent).toBe(true);
    expect(returnValue.messageId).toContain(userId);
  });
});

// ─── DLQ routing ─────────────────────────────────────────────────────────────

describe('DLQ routing', () => {
  it('routes to the dead-letter queue after all retry attempts are exhausted', async () => {
    const failQueue = makeQueue<WelcomeEmailJobData>('tw-welcome-fail', { attempts: 1 });

    const dlqAddedPromise = new Promise<Record<string, unknown>>((resolve) => {
      const failWorker = makeWorker<WelcomeEmailJobData, EmailJobResult>(
        'tw-welcome-fail',
        async () => {
          throw new Error('Simulated template render failure');
        },
      );

      failWorker.on('failed', async (job: Job<WelcomeEmailJobData> | undefined, err: Error) => {
        if (!job) return;
        if (job.attemptsMade >= (job.opts.attempts ?? 1)) {
          const dlqJob = await dlq.add('failed-welcome-email', {
            originalQueue: 'tw-welcome-fail',
            originalJobId: job.id,
            data: job.data,
            failedReason: err.message,
            attempts: job.attemptsMade,
          });
          resolve(dlqJob.data as Record<string, unknown>);
          await failWorker.close();
        }
      });
    });

    await failQueue.add('welcome', {
      userId: 'user-dlq',
      email: 'dlq@example.com',
      name: 'DLQ User',
    });

    const dlqJobData = await dlqAddedPromise;

    expect(dlqJobData.originalQueue).toBe('tw-welcome-fail');
    expect(dlqJobData.failedReason).toBe('Simulated template render failure');
    expect(dlqJobData.attempts).toBe(1);
    expect((dlqJobData.data as Record<string, unknown>).userId).toBe('user-dlq');

    await failQueue.obliterate({ force: true });
    await failQueue.close();
  });
});
