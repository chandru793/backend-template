import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { CacheService } from '../services/cache.service.js';

/**
 * Cache Plugin
 *
 * Provides Redis-backed caching service with cache-aside pattern.
 * Decorates Fastify instance with `cache` service.
 *
 * Usage:
 *   const user = await fastify.cache.getOrSet(`user:${id}`, async () => {
 *     return fastify.prisma.user.findUnique({ where: { id } });
 *   }, 60);
 */
// eslint-disable-next-line @typescript-eslint/require-await
const cachePlugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Only enable caching if configured
  if (!fastify.config.CACHE_ENABLED) {
    // Provide a no-op cache service that passes through to fetcher
    const noopCache: CacheService = {
      get: async () => Promise.resolve(null),
      set: async () => Promise.resolve(),
      del: async () => Promise.resolve(),
      delMany: async () => Promise.resolve(),
      invalidatePattern: async () => Promise.resolve(),
      getOrSet: async <T>(_key: string, fetcher: () => Promise<T>) => fetcher(),
      exists: async () => Promise.resolve(false),
      ttl: async () => Promise.resolve(-1),
      clear: async () => Promise.resolve(),
    } as unknown as CacheService;

    fastify.decorate('cache', noopCache);
    fastify.log.info('Caching disabled (CACHE_ENABLED=false)');
    return;
  }

  // Create cache service instance
  const cacheService = new CacheService(
    fastify.redis, // Use general-purpose Redis connection
    fastify.config.CACHE_TTL, // Default TTL from config
    'cache:', // Prefix for all cache keys
  );

  // Decorate Fastify instance
  fastify.decorate('cache', cacheService);

  fastify.log.info(`Cache service enabled (default TTL: ${fastify.config.CACHE_TTL}s)`);
};

export default fp(cachePlugin, {
  name: 'cache',
  dependencies: ['redis'], // Depends on Redis plugin
});
