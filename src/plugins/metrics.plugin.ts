import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { Registry, collectDefaultMetrics } from 'prom-client';

/**
 * Prometheus metrics plugin
 *
 * Collects default Node.js process metrics (CPU, memory, event loop lag,
 * GC, file descriptors) and exposes them at GET /metrics in the standard
 * Prometheus text exposition format.
 *
 * The registry is decorated on `fastify.metrics` so other plugins (e.g.
 * the business-metrics plugin) can register their own counters/gauges
 * against the same registry.
 *
 * NOTE: /metrics should be protected at the network/infrastructure level
 * in production (e.g. not publicly routed, or behind an internal load balancer).
 */
const metricsPlugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  await Promise.resolve(); // plugin setup is synchronous; satisfies @typescript-eslint/require-await
  const register = new Registry();

  register.setDefaultLabels({ app: 'fastify-production-template' });
  collectDefaultMetrics({ register });

  fastify.decorate('metrics', register);

  fastify.get('/metrics', {
    config: { rateLimit: false },
    schema: { hide: true },
    handler: async (_request, reply) => {
      reply.header('Content-Type', register.contentType).send(await register.metrics());
    },
  });

  fastify.log.info('Prometheus metrics available at GET /metrics');
};

export default fp(metricsPlugin, {
  name: 'metrics',
});
