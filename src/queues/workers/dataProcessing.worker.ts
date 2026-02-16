import { Worker, type Job } from 'bullmq';
import { createQueueConnection } from '../connections.js';
import type { DataProcessingJobData, DataProcessingJobResult } from '../jobs/types.js';
import { deadLetterQueue } from '../index.js';

/**
 * Data Processing Worker
 *
 * Handles CPU-intensive data processing tasks:
 * - Data exports
 * - Data imports
 * - Analytics/reporting
 */
export const dataProcessingWorker = new Worker<DataProcessingJobData, DataProcessingJobResult>(
  'data-processing',
  async (job: Job<DataProcessingJobData>) => {
    const { userId, operation } = job.data;
    // In production: const { userId, operation, params } = job.data;

    await job.log(`Starting ${operation} operation for user ${userId}`);
    await job.updateProgress(10);

    let recordsProcessed = 0;

    // Simulate different operations
    switch (operation) {
      case 'export':
        await job.log('Exporting data...');
        // Simulate export process
        for (let i = 0; i < 10; i++) {
          await new Promise((resolve) => setTimeout(resolve, 200));
          recordsProcessed += 100;
          await job.updateProgress(10 + (i + 1) * 8);
        }
        break;

      case 'import':
        await job.log('Importing data...');
        // Simulate import process
        for (let i = 0; i < 15; i++) {
          await new Promise((resolve) => setTimeout(resolve, 150));
          recordsProcessed += 50;
          await job.updateProgress(10 + (i + 1) * 5);
        }
        break;

      case 'analyze':
        await job.log('Analyzing data...');
        // Simulate analysis
        for (let i = 0; i < 20; i++) {
          await new Promise((resolve) => setTimeout(resolve, 100));
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
  },
  {
    connection: createQueueConnection(),
    concurrency: 2, // Limit concurrency for CPU-intensive tasks
    limiter: {
      max: 5,
      duration: 60000, // Max 5 per minute
    },
  },
);

/**
 * Handle completion
 */
dataProcessingWorker.on('completed', (job: Job<DataProcessingJobData, DataProcessingJobResult>) => {
  console.error(
    `Data processing job ${job.id} completed:`,
    `${job.data.operation} - ${job.returnvalue.recordsProcessed} records`,
  );
});

/**
 * Handle failure - send to DLQ
 */
dataProcessingWorker.on('failed', (job: Job<DataProcessingJobData> | undefined, err: Error) => {
  if (!job) return;

  console.error(`Data processing job ${job.id} failed:`, err.message);

  if (job.attemptsMade >= (job.opts.attempts ?? 2)) {
    deadLetterQueue
      .add('failed-data-processing', {
        originalQueue: 'data-processing',
        originalJobId: job.id,
        data: job.data,
        failedReason: err.message,
        attempts: job.attemptsMade,
      })
      .catch((dlqErr: unknown) => {
        console.error('Failed to add to DLQ:', dlqErr);
      });
    console.error(`Data processing job ${job.id} moved to dead letter queue`);
  }
});

/**
 * Handle errors
 */
dataProcessingWorker.on('error', (err: Error) => {
  console.error('Data processing worker error:', err);
});
