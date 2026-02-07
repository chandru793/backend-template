import { Queue } from 'bullmq';
import { createQueueConnection } from './connections.js';
import type {
  EmailJobData,
  WelcomeEmailJobData,
  DataProcessingJobData,
} from './jobs/types.js';

/**
 * Email Queue
 * Handles all email-related jobs
 */
export const emailQueue = new Queue<EmailJobData>('email', {
  connection: createQueueConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000, // Start with 1s, then 2s, 4s
    },
    removeOnComplete: {
      count: 1000, // Keep last 1000 completed jobs
    },
    removeOnFail: {
      count: 5000, // Keep last 5000 failed jobs
      age: 7 * 24 * 3600, // Or 7 days old
    },
  },
});

/**
 * Welcome Email Queue
 * Specialized queue for welcome emails
 */
export const welcomeEmailQueue = new Queue<WelcomeEmailJobData>('welcome-email', {
  connection: createQueueConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      count: 500,
    },
    removeOnFail: {
      count: 1000,
      age: 7 * 24 * 3600,
    },
  },
});

/**
 * Data Processing Queue
 * Handles heavy data processing jobs
 */
export const dataProcessingQueue = new Queue<DataProcessingJobData>('data-processing', {
  connection: createQueueConnection(),
  defaultJobOptions: {
    attempts: 2, // Fewer attempts for expensive operations
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: {
      count: 100,
      age: 24 * 3600, // Keep for 1 day
    },
    removeOnFail: {
      count: 500,
      age: 30 * 24 * 3600, // Keep failures for 30 days
    },
  },
});

/**
 * Dead Letter Queue
 * Stores jobs that have exhausted all retry attempts
 */
export const deadLetterQueue = new Queue('dead-letter', {
  connection: createQueueConnection(),
  defaultJobOptions: {
    removeOnComplete: false, // Never auto-remove
    removeOnFail: false,
  },
});

/**
 * Close all queue connections
 * Should be called during graceful shutdown
 */
export async function closeQueues(): Promise<void> {
  await Promise.all([
    emailQueue.close(),
    welcomeEmailQueue.close(),
    dataProcessingQueue.close(),
    deadLetterQueue.close(),
  ]);
}
