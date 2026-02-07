import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { PrismaClient } from '@prisma/client';

/**
 * Database plugin - initializes Prisma client
 */
const databasePlugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const isDev = fastify.config.NODE_ENV === 'development';

  const prisma = new PrismaClient({
    log: isDev
      ? [
          { emit: 'event', level: 'query' },
          { emit: 'event', level: 'info' },
          { emit: 'event', level: 'warn' },
          { emit: 'event', level: 'error' },
        ]
      : [
          { emit: 'event', level: 'warn' },
          { emit: 'event', level: 'error' },
        ],
    datasources: {
      db: {
        url: fastify.config.DATABASE_URL,
      },
    },
  });

  // Route Prisma logs through Fastify's Pino logger for consistent structured logging
  if (isDev) {
    prisma.$on('query', (e) => {
      fastify.log.debug({ query: e.query, duration: `${e.duration}ms` }, 'Prisma Query');
    });

    prisma.$on('info', (e) => {
      fastify.log.info({ target: 'prisma' }, e.message);
    });
  }

  prisma.$on('warn', (e) => {
    fastify.log.warn({ target: 'prisma' }, e.message);
  });

  prisma.$on('error', (e) => {
    fastify.log.error({ target: 'prisma' }, e.message);
  });

  // Connect to database
  await prisma.$connect();
  fastify.log.info('Database connected');

  // Decorate Fastify instance with Prisma client
  fastify.decorate('prisma', prisma);

  // Disconnect on close
  fastify.addHook('onClose', async () => {
    fastify.log.info('Disconnecting from database...');
    await prisma.$disconnect();
  });
};

export default fp(databasePlugin, {
  name: 'database',
});
