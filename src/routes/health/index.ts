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
  // Route: /health (folder name becomes prefix)
  fastify.get(
    '/',
    {
      config: { rateLimit: false },
    },
    healthHandler,
  );

  // Kubernetes liveness probe - is the app running?
  // Route: /health/live
  fastify.get(
    '/live',
    {
      config: { rateLimit: false },
    },
    livenessHandler,
  );

  // Kubernetes readiness probe - is the app ready to serve traffic?
  // Route: /health/ready
  fastify.get(
    '/ready',
    {
      config: { rateLimit: false },
    },
    readinessHandler,
  );
};

export default healthRoutes;
