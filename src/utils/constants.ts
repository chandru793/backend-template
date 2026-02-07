/**
 * Application-wide constants
 */

export const APP_NAME = 'fastify-production-template';

/**
 * Health check status values
 */
export const HEALTH_STATUS = {
  HEALTHY: 'healthy',
  UNHEALTHY: 'unhealthy',
  DEGRADED: 'degraded',
} as const;

/**
 * Common HTTP headers
 */
export const HEADERS = {
  REQUEST_ID: 'x-request-id',
} as const;
