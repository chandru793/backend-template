import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';

/**
 * Validation plugin - sets up Zod as the type provider
 * CRITICAL: Must register BEFORE routes
 */
const validationPlugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Set Zod as the validator compiler
  fastify.setValidatorCompiler(validatorCompiler);

  // Set Zod as the serializer compiler (response validation)
  fastify.setSerializerCompiler(serializerCompiler);

  fastify.log.info('Validation plugin registered (Zod type provider)');

  await Promise.resolve(); // Satisfy async requirement
};

export default fp(validationPlugin, {
  name: 'validation',
});
