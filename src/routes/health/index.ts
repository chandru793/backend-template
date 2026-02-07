import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { healthHandler, livenessHandler, readinessHandler } from './handlers.js';

/**
 * Health check routes
 */
const healthRoutes: FastifyPluginAsync = async (fastify: FastifyInstance): Promise<void> => {
  await Promise.resolve(); // Satisfy async requirement
  // Main health check - includes dependency checks
  // Route: /health (folder name becomes prefix)
  fastify.get('/', healthHandler);

  // Kubernetes liveness probe - is the app running?
  // Route: /health/live
  fastify.get('/live', livenessHandler);

  // Kubernetes readiness probe - is the app ready to serve traffic?
  // Route: /health/ready
  fastify.get('/ready', readinessHandler);
};

export default healthRoutes;
