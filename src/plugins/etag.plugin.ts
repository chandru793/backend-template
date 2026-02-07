import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import fastifyEtag from '@fastify/etag';

/**
 * ETag Plugin
 *
 * Automatically generates ETags for all responses.
 * - Clients send If-None-Match header
 * - Server returns 304 Not Modified if ETag matches
 * - Zero-config bandwidth savings
 *
 * Uses fnv1a algorithm (faster than SHA for non-cryptographic use)
 */
const etagPlugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  await fastify.register(fastifyEtag, {
    algorithm: 'fnv1a', // Faster than SHA for non-cryptographic use
  });

  fastify.log.info('ETag plugin registered');
};

export default fp(etagPlugin, {
  name: 'etag',
});
