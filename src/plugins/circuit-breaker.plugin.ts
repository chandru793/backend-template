import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import {
  circuitBreaker,
  ConsecutiveBreaker,
  ExponentialBackoff,
  handleAll,
  handleWhen,
  retry,
  wrap,
} from 'cockatiel';

/**
 * Matches transient connection errors from Node.js and Prisma.
 * These are safe to retry — they indicate a temporary blip, not a logic error.
 *
 * Prisma error codes:
 *   P1001 — Can't reach database server
 *   P1008 — Operations timed out
 */
const handleTransientErrors = handleWhen(
  (err) =>
    err instanceof Error &&
    (err.message.includes('ECONNRESET') ||
      err.message.includes('ETIMEDOUT') ||
      err.message.includes('ECONNREFUSED') ||
      ('code' in err && (err.code === 'P1001' || err.code === 'P1008'))),
);

/**
 * Circuit Breaker + Retry plugin
 *
 * Exposes two decorators:
 *
 *  fastify.breakers — raw circuit breaker policies (for state inspection in health checks)
 *    database: opens after 5 consecutive final failures, recovers after 10 s
 *    redis:    opens after 3 consecutive final failures, recovers after 5 s
 *
 *  fastify.policies — combined (retry → circuit breaker) policies for use in handlers
 *    database: retry transient errors up to 3× with exponential backoff,
 *              then the circuit breaker counts it as one failure
 *    redis:    retry transient errors up to 2×, then circuit breaker counts it
 *
 * Usage in handlers:
 *   const user = await fastify.policies.database.execute(() =>
 *     fastify.prisma.user.findUnique({ where: { id } })
 *   );
 */
const circuitBreakerPlugin: FastifyPluginAsync = async (fastify: FastifyInstance): Promise<void> => {
  await Promise.resolve(); // plugin setup is synchronous

  // ── Raw circuit breakers (kept for health check state inspection) ──────────

  const dbBreaker = circuitBreaker(handleAll, {
    halfOpenAfter: 10_000,
    breaker: new ConsecutiveBreaker(5),
  });

  const redisBreaker = circuitBreaker(handleAll, {
    halfOpenAfter: 5_000,
    breaker: new ConsecutiveBreaker(3),
  });

  // Log every state transition (Closed → Open → HalfOpen → Closed)
  dbBreaker.onStateChange((state) => {
    fastify.log.warn({ breaker: 'database', state }, 'Circuit breaker state change');
  });

  redisBreaker.onStateChange((state) => {
    fastify.log.warn({ breaker: 'redis', state }, 'Circuit breaker state change');
  });

  // ── Combined policies: circuit breaker (outer) wraps retry (inner) ─────────
  // Flow: CB gates the call → retry handles transient failures inside →
  //       only after all retries fail does the CB record one failure.

  const dbRetry = retry(handleTransientErrors, {
    maxAttempts: 3,
    backoff: new ExponentialBackoff(),
  });

  const redisRetry = retry(handleTransientErrors, {
    maxAttempts: 2,
    backoff: new ExponentialBackoff(),
  });

  // Log retries so operators can see transient failures in Pino
  dbRetry.onRetry(({ attempt }) => {
    fastify.log.warn({ attempt }, 'Database transient error — retrying');
  });

  redisRetry.onRetry(({ attempt }) => {
    fastify.log.warn({ attempt }, 'Redis transient error — retrying');
  });

  const dbPolicy = wrap(dbBreaker, dbRetry);
  const redisPolicy = wrap(redisBreaker, redisRetry);

  fastify.decorate('breakers', { database: dbBreaker, redis: redisBreaker });
  fastify.decorate('policies', { database: dbPolicy, redis: redisPolicy });

  fastify.log.info(
    'Circuit breakers registered (db: 5 failures / 10 s, redis: 3 failures / 5 s) with retry',
  );
};

export default fp(circuitBreakerPlugin, {
  name: 'circuit-breaker',
});
