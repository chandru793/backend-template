import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import {
  emailQueue,
  welcomeEmailQueue,
  dataProcessingQueue,
  deadLetterQueue,
  closeQueues,
} from '../queues/index.js';

/**
 * Queue Plugin
 *
 * Registers BullMQ queues with the Fastify instance.
 * Provides access to queues for adding jobs from route handlers.
 *
 * Usage:
 *   await fastify.queues.email.add('send-email', { to, subject, body });
 *   await fastify.queues.welcomeEmail.add('welcome', { userId, email, name });
 */
// eslint-disable-next-line @typescript-eslint/require-await
const queuePlugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Decorate Fastify instance with queues
  fastify.decorate('queues', {
    email: emailQueue,
    welcomeEmail: welcomeEmailQueue,
    dataProcessing: dataProcessingQueue,
    deadLetter: deadLetterQueue,
  });

  // Close all queues on server shutdown
  fastify.addHook('onClose', async () => {
    fastify.log.info('Closing queue connections...');
    await closeQueues();
    fastify.log.info('Queue connections closed');
  });

  fastify.log.info('Queue plugin registered (4 queues available)');
};

export default fp(queuePlugin, {
  name: 'queue',
});
