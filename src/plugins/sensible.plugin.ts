import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import fastifySensible from '@fastify/sensible';

/**
 * Sensible plugin - adds useful utilities and better error handling
 */
const sensiblePlugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  await fastify.register(fastifySensible, {
    sharedSchemaId: 'HttpError',
  });

  fastify.log.debug('Sensible plugin registered');
};

export default fp(sensiblePlugin, {
  name: 'sensible',
});
