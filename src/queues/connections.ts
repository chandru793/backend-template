import { Redis } from 'ioredis';

/**
 * Create a Redis connection for BullMQ
 *
 * CRITICAL: BullMQ requires maxRetriesPerRequest: null
 * Without this setting, workers will throw errors on Redis reconnection.
 */
export function createQueueConnection(): Redis {
  const options: {
    host: string;
    port: number;
    password?: string;
    db: number;
    maxRetriesPerRequest: null;
    enableOfflineQueue: false;
  } = {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: Number(process.env.REDIS_PORT ?? 6379),
    db: Number(process.env.REDIS_DB ?? 0),
    maxRetriesPerRequest: null, // REQUIRED by BullMQ
    enableOfflineQueue: false,
  };

  // Only set password if provided
  if (process.env.REDIS_PASSWORD) {
    options.password = process.env.REDIS_PASSWORD;
  }

  return new Redis(options);
}
