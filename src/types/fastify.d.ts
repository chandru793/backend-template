import type { PrismaClient } from '@prisma/client';
import type { Redis } from 'ioredis';
import type { JWT } from '@fastify/jwt';

declare module 'fastify' {
  interface FastifyInstance {
    config: {
      NODE_ENV: string;
      PORT: number;
      HOST: string;
      LOG_LEVEL: string;
      DATABASE_URL: string;
      REDIS_HOST: string;
      REDIS_PORT: number;
      REDIS_PASSWORD: string;
      REDIS_DB: number;
      AUTH_ENABLED: boolean;
      JWT_SECRET: string;
      JWT_ACCESS_TOKEN_EXPIRES_IN: string;
      JWT_REFRESH_TOKEN_EXPIRES_IN: string;
      CORS_ORIGIN: string;
      RATE_LIMIT_MAX: number;
      RATE_LIMIT_TIME_WINDOW: number;
      CACHE_ENABLED: boolean;
      CACHE_TTL: number;
      SWAGGER_ENABLED: boolean;
    };
    prisma: PrismaClient;
    redis: Redis;
    redisQueue: Redis;
    redisRateLimit: Redis;
    // JWT instance (handles both access and refresh tokens)
    jwt: JWT;
    // Added by @fastify/swagger-ui when registered (optional until Phase 10)
    swaggerCSP?: {
      script: string[];
      style: string[];
    };
  }

  interface FastifyRequest {
    user?: {
      userId: string;
      email: string;
      role: string;
    };
  }
}
