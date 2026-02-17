import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUI from '@fastify/swagger-ui';
import { jsonSchemaTransform } from 'fastify-type-provider-zod';

/**
 * Swagger / OpenAPI 3.1 plugin
 *
 * Registers the OpenAPI spec and Swagger UI.
 * Only enabled when SWAGGER_ENABLED=true (never in production).
 *
 * UI:  GET /documentation
 * Spec: GET /documentation/json
 */
const swaggerPlugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  if (!fastify.config.SWAGGER_ENABLED || fastify.config.NODE_ENV === 'production') {
    return;
  }

  await fastify.register(fastifySwagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'Fastify Production Template API',
        description:
          'A production-ready Fastify backend template with authentication, caching, rate limiting, and background queues.',
        version: '1.0.0',
      },
      servers: [
        {
          url: 'http://localhost:3000',
          description: 'Development server',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'JWT access token. Obtain via POST /api/v1/auth/login',
          },
        },
      },
      tags: [
        { name: 'Health', description: 'Health check and readiness probes' },
        { name: 'Auth', description: 'Authentication — register, login, refresh, logout' },
        { name: 'Users', description: 'User management CRUD operations' },
      ],
    },
    transform: jsonSchemaTransform,
  });

  await fastify.register(fastifySwaggerUI, {
    routePrefix: '/documentation',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
      persistAuthorization: true,
    },
    staticCSP: true,
  });

  fastify.log.info('Swagger UI available at /documentation');
};

export default fp(swaggerPlugin, {
  name: 'swagger',
  // Must load before routes so schemas are registered
  dependencies: ['security'],
});
