import { Queue, Worker, QueueEvents, type Processor } from 'bullmq';
import { createQueueConnection } from '../../src/queues/connections.js';

/**
 * Create a fresh Queue connected to the testcontainer Redis.
 * Each call produces an independent connection so tests are fully isolated.
 */
export function makeQueue<T = unknown>(name: string, defaultJobOptions?: object) {
  return new Queue<T>(name, {
    connection: createQueueConnection(),
    ...(defaultJobOptions ? { defaultJobOptions } : {}),
  });
}

/**
 * Create a fresh Worker connected to the testcontainer Redis.
 */
export function makeWorker<T = unknown, R = unknown>(name: string, processor: Processor<T, R>) {
  return new Worker<T, R>(name, processor, {
    connection: createQueueConnection(),
  });
}

/**
 * Create a QueueEvents listener for a given queue.
 * Required for job.waitUntilFinished().
 */
export function makeQueueEvents(name: string) {
  return new QueueEvents(name, { connection: createQueueConnection() });
}
