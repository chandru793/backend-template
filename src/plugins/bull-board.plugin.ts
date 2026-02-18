import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { FastifyAdapter } from '@bull-board/fastify';

/**
 * Bull Board plugin
 *
 * Mounts a queue inspection UI at /queues (development only).
 * Shows job counts, retries, and dead-letter queue contents.
 *
 * Requires the queue plugin to be registered first.
 */
const bullBoardPlugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  if (fastify.config.NODE_ENV === 'production') {
    return;
  }

  const serverAdapter = new FastifyAdapter();

  createBullBoard({
    queues: [
      new BullMQAdapter(fastify.queues.email),
      new BullMQAdapter(fastify.queues.welcomeEmail),
      new BullMQAdapter(fastify.queues.dataProcessing),
      new BullMQAdapter(fastify.queues.deadLetter),
    ],
    serverAdapter,
  });

  serverAdapter.setBasePath('/queues');

  await fastify.register(serverAdapter.registerPlugin(), { prefix: '/queues' });

  fastify.log.info('Bull Board UI available at /queues');
};

export default fp(bullBoardPlugin, {
  name: 'bull-board',
  dependencies: ['queue'],
});
