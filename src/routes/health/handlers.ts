import type { FastifyRequest, FastifyReply } from 'fastify';
import type { HealthStatus, HealthCheckResponse } from '../../types/index.js';

interface DependencyCheck {
  status: HealthStatus;
  latency?: number;
  error?: string;
}

/**
 * Check database connectivity
 */
async function checkDatabase(request: FastifyRequest): Promise<DependencyCheck> {
  const start = Date.now();
  try {
    await request.server.prisma.$queryRaw`SELECT 1`;
    return {
      status: 'healthy',
      latency: Date.now() - start,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check Redis connectivity
 */
async function checkRedis(request: FastifyRequest): Promise<DependencyCheck> {
  const start = Date.now();
  try {
    const redis = request.server.redis;
    if (redis.status !== 'ready') {
      return {
        status: 'unhealthy',
        error: 'Redis not connected',
      };
    }
    await redis.ping();
    return {
      status: 'healthy',
      latency: Date.now() - start,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Main health check handler
 * Returns detailed health status of all dependencies
 */
export async function healthHandler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const [database, redis] = await Promise.all([checkDatabase(request), checkRedis(request)]);

  const checks = { database, redis };

  // Determine overall status
  const allHealthy = Object.values(checks).every((c) => c.status === 'healthy');
  const anyUnhealthy = Object.values(checks).some((c) => c.status === 'unhealthy');

  let status: HealthStatus;
  if (allHealthy) {
    status = 'healthy';
  } else if (anyUnhealthy) {
    status = 'unhealthy';
  } else {
    status = 'degraded';
  }

  const response: HealthCheckResponse = {
    status,
    timestamp: Date.now(),
    uptime: process.uptime(),
    checks,
  };

  const statusCode = status === 'healthy' ? 200 : status === 'degraded' ? 200 : 503;
  reply.code(statusCode).send(response);
}

/**
 * Liveness probe handler
 * Just checks if the process is running
 */
export function livenessHandler(_request: FastifyRequest, reply: FastifyReply): void {
  void reply.send({
    status: 'healthy',
    timestamp: Date.now(),
  });
}

/**
 * Readiness probe handler
 * Checks if the app is ready to serve traffic
 */
export async function readinessHandler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const database = await checkDatabase(request);

  if (database.status !== 'healthy') {
    reply.code(503).send({
      status: 'unhealthy',
      timestamp: Date.now(),
      reason: 'Database not ready',
    });
    return;
  }

  reply.send({
    status: 'healthy',
    timestamp: Date.now(),
  });
}
