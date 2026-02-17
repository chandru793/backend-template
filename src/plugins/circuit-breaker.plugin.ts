import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { circuitBreaker, ConsecutiveBreaker, handleAll } from 'cockatiel';

/**
 * Circuit Breaker plugin
 *
 * Protects critical external dependencies (DB, Redis) from cascading failures.
 * - database: opens after 5 consecutive failures, retries after 10 seconds
 * - redis:    opens after 3 consecutive failures, retries after 5 seconds
 *
 * Usage in handlers:
 *   const result = await fastify.breakers.database.execute(() => prisma.user.findMany());
 */
const circuitBreakerPlugin: FastifyPluginAsync = async (fastify: FastifyInstance): Promise<void> => {
  await Promise.resolve(); // Satisfy async requirement — plugin setup is synchronous
  const database = circuitBreaker(handleAll, {
    halfOpenAfter: 10_000, // attempt recovery after 10 seconds
    breaker: new ConsecutiveBreaker(5), // open after 5 consecutive failures
  });

  const redis = circuitBreaker(handleAll, {
    halfOpenAfter: 5_000, // attempt recovery after 5 seconds
    breaker: new ConsecutiveBreaker(3), // open after 3 consecutive failures
  });

  // Log state transitions
  database.onStateChange((state) => {
    fastify.log.warn({ breaker: 'database', state }, 'Circuit breaker state change');
  });

  redis.onStateChange((state) => {
    fastify.log.warn({ breaker: 'redis', state }, 'Circuit breaker state change');
  });

  fastify.decorate('breakers', { database, redis });

  fastify.log.info('Circuit breakers registered (database: 5 failures, redis: 3 failures)');
};

export default fp(circuitBreakerPlugin, {
  name: 'circuit-breaker',
});
