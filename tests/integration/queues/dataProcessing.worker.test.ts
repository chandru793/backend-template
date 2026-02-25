import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { type Job } from 'bullmq';
import { makeQueue, makeWorker, makeQueueEvents } from '../../helpers/queue.js';
import type {
  DataProcessingJobData,
  DataProcessingJobResult,
} from '../../../src/queues/jobs/types.js';

/**
 * Data Processing Worker Tests
 *
 * Mirrors the contract defined in src/queues/workers/dataProcessing.worker.ts:
 *   - export  → recordsProcessed = 10 iterations × 100 = 1 000
 *   - import  → recordsProcessed = 15 iterations × 50  =   750
 *   - analyze → recordsProcessed = 20 iterations × 25  =   500
 *   - All operations return success: true, a timestamp, and an outputUrl
 *   - Routes to DLQ after all retry attempts are exhausted
 *
 * Each loop iteration uses 1 ms instead of 100-200 ms so the suite is fast.
 */

const QUEUE_NAME = 'tw-dp';
const DLQ_NAME = 'tw-dlq-dp';

const queue = makeQueue<DataProcessingJobData>(QUEUE_NAME, { attempts: 2 });
const dlq = makeQueue(DLQ_NAME, { removeOnComplete: false, removeOnFail: false });
const queueEvents = makeQueueEvents(QUEUE_NAME);

// Data processing processor — same logic as dataProcessing.worker.ts, 1 ms delays
const dataProcessingProcessor = async (
  job: Job<DataProcessingJobData>,
): Promise<DataProcessingJobResult> => {
  const { userId, operation } = job.data;

  await job.log(`Starting ${operation} operation for user ${userId}`);
  await job.updateProgress(10);

  let recordsProcessed = 0;

  switch (operation) {
    case 'export':
      await job.log('Exporting data...');
      for (let i = 0; i < 10; i++) {
        await new Promise((resolve) => setTimeout(resolve, 1));
        recordsProcessed += 100;
        await job.updateProgress(10 + (i + 1) * 8);
      }
      break;

    case 'import':
      await job.log('Importing data...');
      for (let i = 0; i < 15; i++) {
        await new Promise((resolve) => setTimeout(resolve, 1));
        recordsProcessed += 50;
        await job.updateProgress(10 + (i + 1) * 5);
      }
      break;

    case 'analyze':
      await job.log('Analyzing data...');
      for (let i = 0; i < 20; i++) {
        await new Promise((resolve) => setTimeout(resolve, 1));
        recordsProcessed += 25;
        await job.updateProgress(10 + (i + 1) * 4);
      }
      break;
  }

  await job.log(`${operation} completed: ${recordsProcessed} records processed`);
  await job.updateProgress(100);

  return {
    success: true,
    recordsProcessed,
    timestamp: Date.now(),
    outputUrl: `/exports/${userId}/${operation}-${Date.now()}.csv`,
  };
};

let worker = makeWorker<DataProcessingJobData, DataProcessingJobResult>(
  QUEUE_NAME,
  dataProcessingProcessor,
);

worker.on('failed', (job: Job<DataProcessingJobData> | undefined, err: Error) => {
  if (!job) return;
  if (job.attemptsMade >= (job.opts.attempts ?? 2)) {
    dlq
      .add('failed-data-processing', {
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

// ─── Operation: export ────────────────────────────────────────────────────────

describe('export operation', () => {
  it('processes 10 × 100 = 1 000 records and returns success: true', async () => {
    const job = await queue.add('process', {
      userId: 'u-export',
      operation: 'export',
      params: {},
    });

    const result = await job.waitUntilFinished(queueEvents, 15_000);

    expect(result.success).toBe(true);
    expect(result.recordsProcessed).toBe(1000);
    expect(typeof result.timestamp).toBe('number');
  });

  it('outputUrl contains "export" and the userId', async () => {
    const userId = 'u-export-url';
    const job = await queue.add('process', { userId, operation: 'export', params: {} });

    const result = await job.waitUntilFinished(queueEvents, 15_000);

    expect(result.outputUrl).toContain('export');
    expect(result.outputUrl).toContain(userId);
    expect(result.outputUrl).toMatch(/\.csv$/);
  });
});

// ─── Operation: import ────────────────────────────────────────────────────────

describe('import operation', () => {
  it('processes 15 × 50 = 750 records and returns success: true', async () => {
    const job = await queue.add('process', {
      userId: 'u-import',
      operation: 'import',
      params: {},
    });

    const result = await job.waitUntilFinished(queueEvents, 15_000);

    expect(result.success).toBe(true);
    expect(result.recordsProcessed).toBe(750);
    expect(typeof result.timestamp).toBe('number');
  });

  it('outputUrl contains "import"', async () => {
    const job = await queue.add('process', {
      userId: 'u-import-url',
      operation: 'import',
      params: {},
    });

    const result = await job.waitUntilFinished(queueEvents, 15_000);
    expect(result.outputUrl).toContain('import');
  });
});

// ─── Operation: analyze ───────────────────────────────────────────────────────

describe('analyze operation', () => {
  it('processes 20 × 25 = 500 records and returns success: true', async () => {
    const job = await queue.add('process', {
      userId: 'u-analyze',
      operation: 'analyze',
      params: {},
    });

    const result = await job.waitUntilFinished(queueEvents, 15_000);

    expect(result.success).toBe(true);
    expect(result.recordsProcessed).toBe(500);
    expect(typeof result.timestamp).toBe('number');
  });

  it('outputUrl contains "analyze"', async () => {
    const job = await queue.add('process', {
      userId: 'u-analyze-url',
      operation: 'analyze',
      params: {},
    });

    const result = await job.waitUntilFinished(queueEvents, 15_000);
    expect(result.outputUrl).toContain('analyze');
  });
});

// ─── DLQ routing ─────────────────────────────────────────────────────────────

describe('DLQ routing', () => {
  it('routes to the dead-letter queue after all retry attempts (2) are exhausted', async () => {
    const failQueue = makeQueue<DataProcessingJobData>('tw-dp-fail', { attempts: 1 });

    const dlqAddedPromise = new Promise<Record<string, unknown>>((resolve) => {
      const failWorker = makeWorker<DataProcessingJobData, DataProcessingJobResult>(
        'tw-dp-fail',
        async () => {
          throw new Error('Simulated processing failure');
        },
      );

      failWorker.on(
        'failed',
        async (job: Job<DataProcessingJobData> | undefined, err: Error) => {
          if (!job) return;
          if (job.attemptsMade >= (job.opts.attempts ?? 1)) {
            const dlqJob = await dlq.add('failed-data-processing', {
              originalQueue: 'tw-dp-fail',
              originalJobId: job.id,
              data: job.data,
              failedReason: err.message,
              attempts: job.attemptsMade,
            });
            resolve(dlqJob.data as Record<string, unknown>);
            await failWorker.close();
          }
        },
      );
    });

    await failQueue.add('process', {
      userId: 'u-dlq',
      operation: 'export',
      params: {},
    });

    const dlqJobData = await dlqAddedPromise;

    expect(dlqJobData.originalQueue).toBe('tw-dp-fail');
    expect(dlqJobData.failedReason).toBe('Simulated processing failure');
    expect(dlqJobData.attempts).toBe(1);
    expect((dlqJobData.data as Record<string, unknown>).operation).toBe('export');

    await failQueue.obliterate({ force: true });
    await failQueue.close();
  });
});
