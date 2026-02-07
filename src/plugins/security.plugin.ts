import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import fastifyHelmet from '@fastify/helmet';
import fastifyCors from '@fastify/cors';
import fastifyCompress from '@fastify/compress';

/**
 * Security plugin - configures Helmet, CORS, and compression
 */
const securityPlugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Helmet for security headers
  // Callback form is required to access instance.swaggerCSP for Swagger UI compatibility
  await fastify.register(fastifyHelmet, (instance) => {
    return {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"].concat(
            instance.swaggerCSP?.style ?? [],
          ),
          imgSrc: ["'self'", 'data:', 'validator.swagger.io'],
          scriptSrc: ["'self'"].concat(instance.swaggerCSP?.script ?? []),
          formAction: ["'self'"],
        },
      },
      crossOriginEmbedderPolicy: false,
    };
  });

  // CORS configuration
  // Callback form handles requests with no origin (mobile apps, curl, server-to-server)
  const allowedOrigins = fastify.config.CORS_ORIGIN.split(',').map((o) => o.trim());

  await fastify.register(fastifyCors, {
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) {
        cb(null, true);
      } else {
        cb(new Error('Not allowed by CORS'), false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    exposedHeaders: [
      'X-Request-ID',
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
    ],
    maxAge: 600, // Cache preflight for 10 minutes
  });

  // Response compression
  await fastify.register(fastifyCompress, {
    global: true,
    encodings: ['gzip', 'deflate'],
    threshold: 1024, // Only compress responses > 1KB
  });

  fastify.log.info('Security plugins registered (Helmet, CORS, Compress)');
};

export default fp(securityPlugin, {
  name: 'security',
});
