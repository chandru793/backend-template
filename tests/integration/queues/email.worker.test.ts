import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { type Job } from 'bullmq';
import { makeQueue, makeWorker, makeQueueEvents } from '../../helpers/queue.js';
import type { EmailJobData, EmailJobResult } from '../../../src/queues/jobs/types.js';

/**
 * Email Worker Tests
 *
 * Uses fresh Queue + Worker instances on isolated queue names (prefixed with
 * 'tw-') so these tests are fully independent from the application singletons.
 *
 * The processor mirrors the real email.worker.ts logic but with negligible
 * delays so the suite stays fast. We verify the observable contract:
 *   - Processor returns the correct EmailJobResult shape
 *   - The completed event fires with the return value
 *   - After all retry attempts are exhausted the job is routed to the DLQ
 */

const QUEUE_NAME = 'tw-email';
const DLQ_NAME = 'tw-dlq-email';

const queue = makeQueue<EmailJobData>(QUEUE_NAME, { attempts: 3 });
const dlq = makeQueue(DLQ_NAME, { removeOnComplete: false, removeOnFail: false });
const queueEvents = makeQueueEvents(QUEUE_NAME);

// Email processor — same logic as email.worker.ts, 1 ms delay instead of 1 000 ms
const emailProcessor = async (job: Job<EmailJobData>): Promise<EmailJobResult> => {
  const { to } = job.data;
  await job.log(`Processing email to ${to}`);
  await job.updateProgress(25);
  await new Promise((resolve) => setTimeout(resolve, 1));
  await job.updateProgress(75);
  await job.log(`Email sent successfully to ${to}`);
  await job.updateProgress(100);
  return {
    sent: true,
    messageId: `mock-${Date.now()}`,
    timestamp: Date.now(),
  };
};

let worker = makeWorker<EmailJobData, EmailJobResult>(QUEUE_NAME, emailProcessor);

// Attach DLQ routing — mirrors the failed handler in email.worker.ts
worker.on('failed', (job: Job<EmailJobData> | undefined, err: Error) => {
  if (!job) return;
  if (job.attemptsMade >= (job.opts.attempts ?? 3)) {
    dlq
      .add('failed-email', {
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
  // Wait for worker to be ready
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
  it('processes a valid email job and returns sent: true with a messageId', async () => {
    const job = await queue.add('send-email', {
      to: 'user@example.com',
      subject: 'Welcome',
      body: 'Hello there',
    });

    const result = await job.waitUntilFinished(queueEvents, 10_000);

    expect(result.sent).toBe(true);
    expect(typeof result.messageId).toBe('string');
    expect(result.messageId).toMatch(/^mock-\d+$/);
    expect(typeof result.timestamp).toBe('number');
  });

  it('fires the completed event with the correct return value', async () => {
    const completedPromise = new Promise<EmailJobResult>((resolve) => {
      worker.on('completed', (job: Job<EmailJobData, EmailJobResult>) => {
        resolve(job.returnvalue);
      });
    });

    await queue.add('send-email', {
      to: 'events@example.com',
      subject: 'Event test',
      body: 'Testing events',
    });

    const returnValue = await completedPromise;
    expect(returnValue.sent).toBe(true);
    expect(returnValue.messageId).toBeDefined();
  });

  it('updates progress to 25, 75, and 100 during processing', async () => {
    const progressValues: number[] = [];

    queueEvents.on('progress', ({ data }) => {
      progressValues.push(data as number);
    });

    const job = await queue.add('send-email', {
      to: 'progress@example.com',
      subject: 'Progress test',
      body: 'Testing progress',
    });

    await job.waitUntilFinished(queueEvents, 10_000);

    expect(progressValues).toContain(25);
    expect(progressValues).toContain(75);
    expect(progressValues).toContain(100);
  });
});

// ─── Retry & Dead-Letter Queue routing ───────────────────────────────────────

describe('DLQ routing', () => {
  it('routes to the dead-letter queue after all retry attempts are exhausted', async () => {
    // Use a one-shot queue (attempts: 1) so DLQ routing happens immediately
    const failQueue = makeQueue<EmailJobData>('tw-email-fail', { attempts: 1 });
    const failQueueEvents = makeQueueEvents('tw-email-fail');

    const dlqAddedPromise = new Promise<Record<string, unknown>>((resolve) => {
      const failWorker = makeWorker<EmailJobData, EmailJobResult>(
        'tw-email-fail',
        async () => {
          throw new Error('Simulated SMTP failure');
        },
      );

      failWorker.on('failed', async (job: Job<EmailJobData> | undefined, err: Error) => {
        if (!job) return;
        if (job.attemptsMade >= (job.opts.attempts ?? 1)) {
          const dlqJob = await dlq.add('failed-email', {
            originalQueue: 'tw-email-fail',
            originalJobId: job.id,
            data: job.data,
            failedReason: err.message,
            attempts: job.attemptsMade,
          });
          resolve((await dlqJob.data) as Record<string, unknown>);
          await failWorker.close();
        }
      });
    });

    await failQueue.add('send-email', {
      to: 'fail@example.com',
      subject: 'Will fail',
      body: 'Trigger DLQ',
    });

    const dlqJobData = await dlqAddedPromise;

    expect(dlqJobData.originalQueue).toBe('tw-email-fail');
    expect(typeof dlqJobData.originalJobId).toBe('string');
    expect(dlqJobData.failedReason).toBe('Simulated SMTP failure');
    expect(dlqJobData.attempts).toBe(1);
    expect((dlqJobData.data as Record<string, unknown>).to).toBe('fail@example.com');

    await failQueueEvents.close();
    await failQueue.obliterate({ force: true });
    await failQueue.close();
  });
});
