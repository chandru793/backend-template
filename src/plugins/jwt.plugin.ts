import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import fp from 'fastify-plugin';

/**
 * JWT plugin - sets up JWT authentication
 * Default expiry: 15 minutes (for access tokens)
 * Refresh tokens use custom expiry in sign() call
 */
const jwtPlugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Register JWT plugin
  await fastify.register(fastifyJwt, {
    secret: fastify.config.JWT_SECRET,
    sign: {
      expiresIn: '15m', // Default for access tokens
    },
  });

  fastify.log.info('JWT plugin registered');
};

export default fp(jwtPlugin, {
  name: 'jwt',
});
