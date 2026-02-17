import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { healthHandler, livenessHandler, readinessHandler } from './handlers.js';

/**
 * Health check routes
 * Rate limiting is disabled for all health endpoints to allow
 * frequent polling by monitoring systems and load balancers.
 */
const healthRoutes: FastifyPluginAsync = async (fastify: FastifyInstance): Promise<void> => {
  await Promise.resolve(); // Satisfy async requirement

  // Main health check - includes dependency checks
  fastify.get(
    '/',
    {
      schema: {
        tags: ['Health'],
        summary: 'Health check',
        description: 'Returns service health including database and Redis connectivity.',
      },
      config: { rateLimit: false },
    },
    healthHandler,
  );

  // Kubernetes liveness probe
  fastify.get(
    '/live',
    {
      schema: {
        tags: ['Health'],
        summary: 'Liveness probe',
        description: 'Kubernetes liveness probe. Returns 200 if the process is alive.',
      },
      config: { rateLimit: false },
    },
    livenessHandler,
  );

  // Kubernetes readiness probe
  fastify.get(
    '/ready',
    {
      schema: {
        tags: ['Health'],
        summary: 'Readiness probe',
        description: 'Kubernetes readiness probe. Returns 200 when ready to serve traffic.',
      },
      config: { rateLimit: false },
    },
    readinessHandler,
  );
};

export default healthRoutes;
