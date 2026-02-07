import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import rateLimit from '@fastify/rate-limit';

/**
 * Rate Limiting Plugin
 *
 * Redis-backed rate limiting with:
 * - Per-user rate limits (if authenticated)
 * - Per-IP rate limits (if not authenticated)
 * - Fail-closed strategy (deny if Redis is down)
 * - IETF RateLimit header draft spec
 * - Per-route override support
 *
 * Global defaults can be overridden per-route via config.rateLimit option.
 */
const rateLimitPlugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  await fastify.register(rateLimit, {
    global: true,
    max: fastify.config.RATE_LIMIT_MAX,
    timeWindow: fastify.config.RATE_LIMIT_TIME_WINDOW,
    redis: fastify.redisRateLimit,
    nameSpace: 'rl:', // Short prefix saves Redis memory
    keyGenerator: (request) => {
      // Per-user if authenticated, per-IP otherwise
      const user = request.user as { userId?: string } | undefined;
      return user?.userId ?? request.ip;
    },
    allowList: ['127.0.0.1', '::1'], // Localhost bypass
    skipOnError: false, // Fail CLOSED - deny if Redis down (security)
    enableDraftSpec: true, // IETF RateLimit header draft spec
    addHeadersOnExceeding: {
      'x-ratelimit-limit': true,
      'x-ratelimit-remaining': true,
      'x-ratelimit-reset': true,
    },
    addHeaders: {
      'x-ratelimit-limit': true,
      'x-ratelimit-remaining': true,
      'x-ratelimit-reset': true,
      'retry-after': true,
    },
  });

  fastify.log.info('Rate limiting enabled');
};

export default fp(rateLimitPlugin, {
  name: 'rate-limit',
  dependencies: ['redis'], // Depends on Redis plugin
});
