import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';
import fastifyEnv from '@fastify/env';
import fastifyAutoload from '@fastify/autoload';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { loggerConfig } from './utils/logger.js';
import { envSchema } from './config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface BuildAppOptions {
  serverOptions?: FastifyServerOptions;
}

/**
 * Build and configure the Fastify application
 */
export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const { serverOptions = {} } = options;

  // Create Fastify instance with logging
  const app = Fastify({
    logger: loggerConfig,
    ...serverOptions,
  });

  // Register environment variables plugin first
  await app.register(fastifyEnv, {
    schema: envSchema,
    dotenv: true,
  });

  // Log startup info
  app.log.info(`Starting application in ${app.config.NODE_ENV} mode`);

  // Register plugins
  await app.register(fastifyAutoload, {
    dir: join(__dirname, 'plugins'),
    options: {},
    forceESM: true,
  });

  // Register routes
  await app.register(fastifyAutoload, {
    dir: join(__dirname, 'routes'),
    options: { prefix: '' },
    forceESM: true,
  });

  return app;
}
