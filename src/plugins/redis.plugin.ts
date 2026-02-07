import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { Redis, type RedisOptions } from 'ioredis';

/**
 * Create a Redis connection with the given options.
 * Separate connections should be used for different subsystems
 * (general, rate-limit, BullMQ) to prevent cascading failures.
 */
function createRedisConnection(
  baseOptions: RedisOptions,
  overrides: Partial<RedisOptions> = {},
): Redis {
  return new Redis({
    ...baseOptions,
    ...overrides,
    lazyConnect: true,
  });
}

/**
 * Redis plugin - initializes Redis clients for different subsystems
 */
const redisPlugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const baseOptions: RedisOptions = {
    host: fastify.config.REDIS_HOST,
    port: fastify.config.REDIS_PORT,
    db: fastify.config.REDIS_DB,
    retryStrategy: (times: number) => {
      if (times > 3) {
        fastify.log.error('Redis connection failed after 3 retries');
        return null;
      }
      const delay = Math.min(times * 200, 2000);
      fastify.log.warn(`Redis connection attempt ${times}, retrying in ${delay}ms`);
      return delay;
    },
  };

  // Only set password if provided
  if (fastify.config.REDIS_PASSWORD) {
    baseOptions.password = fastify.config.REDIS_PASSWORD;
  }

  // General-purpose Redis connection (caching, sessions, etc.)
  const redis = createRedisConnection(baseOptions, {
    maxRetriesPerRequest: 3,
  });

  // BullMQ requires maxRetriesPerRequest: null
  const redisQueue = createRedisConnection(baseOptions, {
    maxRetriesPerRequest: null,
    enableOfflineQueue: false,
  });

  // Rate limiting needs fast failure
  const redisRateLimit = createRedisConnection(baseOptions, {
    maxRetriesPerRequest: 1,
    connectTimeout: 500,
    enableOfflineQueue: false,
  });

  // Connect all instances
  const connections = [
    { name: 'general', client: redis },
    { name: 'queue', client: redisQueue },
    { name: 'rate-limit', client: redisRateLimit },
  ];

  for (const conn of connections) {
    try {
      await conn.client.connect();
      fastify.log.info(`Redis [${conn.name}] connected`);
    } catch {
      fastify.log.warn(`Redis [${conn.name}] connection failed, continuing without it`);
    }

    conn.client.on('error', (err: Error) => {
      fastify.log.error({ err }, `Redis [${conn.name}] connection error`);
    });
  }

  // Decorate Fastify instance
  fastify.decorate('redis', redis);
  fastify.decorate('redisQueue', redisQueue);
  fastify.decorate('redisRateLimit', redisRateLimit);

  // Disconnect all on close
  fastify.addHook('onClose', async () => {
    fastify.log.info('Disconnecting from Redis...');
    await Promise.all(connections.map((conn) => conn.client.quit()));
  });
};

export default fp(redisPlugin, {
  name: 'redis',
});
