import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { Counter, Gauge } from 'prom-client';

/**
 * Business Metrics plugin
 *
 * Registers application-level Prometheus metrics against the shared
 * registry exposed by the metrics plugin (fastify.metrics):
 *
 *   circuit_breaker_state{breaker}   Gauge   0=Closed 1=Open 2=HalfOpen
 *   cache_hits_total                 Counter
 *   cache_misses_total               Counter (includes Redis errors surfaced as null)
 *   queue_jobs{queue, status}        Gauge   waiting/active/failed/delayed/paused
 *
 * Cache tracking wraps fastify.cache.get so both direct .get() calls and
 * .getOrSet()-driven cache probes are counted in a single place.
 */
const businessMetricsPlugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  await Promise.resolve(); // plugin setup is synchronous; satisfies @typescript-eslint/require-await

  const register = fastify.metrics;

  // ── Circuit breaker state ─────────────────────────────────────────────────
  // Gauge collect() is called on every Prometheus scrape — always fresh values.
  // 0 = Closed (healthy), 1 = Open (failing fast), 2 = HalfOpen (probing)
  new Gauge({
    name: 'circuit_breaker_state',
    help: 'Circuit breaker state — 0=Closed, 1=Open, 2=HalfOpen',
    labelNames: ['breaker'] as const,
    registers: [register],
    collect() {
      this.set({ breaker: 'database' }, fastify.breakers.database.state);
      this.set({ breaker: 'redis' }, fastify.breakers.redis.state);
    },
  });

  // ── Cache hit / miss ──────────────────────────────────────────────────────
  const cacheHits = new Counter({
    name: 'cache_hits_total',
    help: 'Total number of cache hits',
    registers: [register],
  });

  const cacheMisses = new Counter({
    name: 'cache_misses_total',
    help: 'Total number of cache misses (includes Redis errors surfaced as null)',
    registers: [register],
  });

  // Wrap cache.get to track hits/misses at a single interception point.
  // CacheService swallows errors and returns null — those count as misses.
  const origGet = fastify.cache.get.bind(fastify.cache) as <T>(key: string) => Promise<T | null>;
  fastify.cache.get = async <T>(key: string): Promise<T | null> => {
    const result = await origGet<T>(key);
    if (result !== null) {
      cacheHits.inc();
    } else {
      cacheMisses.inc();
    }
    return result;
  };

  // ── Queue depth ───────────────────────────────────────────────────────────
  // Gauge collect() fetches live BullMQ job counts on every scrape.
  const queueEntries = [
    { name: 'email', queue: fastify.queues.email },
    { name: 'welcome-email', queue: fastify.queues.welcomeEmail },
    { name: 'data-processing', queue: fastify.queues.dataProcessing },
    { name: 'dead-letter', queue: fastify.queues.deadLetter },
  ] as const;

  new Gauge({
    name: 'queue_jobs',
    help: 'Number of jobs per queue broken down by status',
    labelNames: ['queue', 'status'] as const,
    registers: [register],
    async collect() {
      await Promise.all(
        queueEntries.map(async ({ name, queue }) => {
          const counts = await queue.getJobCounts(
            'waiting',
            'active',
            'failed',
            'delayed',
            'paused',
          );
          for (const [status, count] of Object.entries(counts)) {
            this.set({ queue: name, status }, count);
          }
        }),
      );
    },
  });

  fastify.log.info(
    'Business metrics registered (circuit_breaker_state, cache_hits/misses, queue_jobs)',
  );
};

export default fp(businessMetricsPlugin, {
  name: 'business-metrics',
  dependencies: ['metrics', 'cache', 'queue'],
});
