/**
 * Environment variables schema for validation with @fastify/env
 *
 * Single source of truth: This JSON Schema is used by @fastify/env for
 * runtime validation. Types are declared in src/types/fastify.d.ts.
 */
export const envSchema = {
  type: 'object',
  required: ['DATABASE_URL', 'JWT_SECRET'],
  properties: {
    NODE_ENV: {
      type: 'string',
      default: 'development',
    },
    PORT: {
      type: 'number',
      default: 3000,
    },
    HOST: {
      type: 'string',
      default: '0.0.0.0',
    },
    LOG_LEVEL: {
      type: 'string',
      default: 'info',
    },
    DATABASE_URL: {
      type: 'string',
    },
    REDIS_HOST: {
      type: 'string',
      default: 'localhost',
    },
    REDIS_PORT: {
      type: 'number',
      default: 6379,
    },
    REDIS_PASSWORD: {
      type: 'string',
      default: '',
    },
    REDIS_DB: {
      type: 'number',
      default: 0,
    },
    AUTH_ENABLED: {
      type: 'boolean',
      default: true,
    },
    JWT_SECRET: {
      type: 'string',
      // No default — must be explicitly set. App will fail to start without it.
    },
    JWT_ACCESS_TOKEN_EXPIRES_IN: {
      type: 'string',
      default: '15m',
    },
    JWT_REFRESH_TOKEN_EXPIRES_IN: {
      type: 'string',
      default: '7d',
    },
    CORS_ORIGIN: {
      type: 'string',
      default: 'http://localhost:3000',
    },
    RATE_LIMIT_MAX: {
      type: 'number',
      default: 1000,
    },
    RATE_LIMIT_TIME_WINDOW: {
      type: 'number',
      default: 900000, // 15 minutes in ms
    },
    CACHE_ENABLED: {
      type: 'boolean',
      default: true,
    },
    CACHE_TTL: {
      type: 'number',
      default: 300, // 5 minutes
    },
    SWAGGER_ENABLED: {
      type: 'boolean',
      default: true,
    },
  },
} as const;
