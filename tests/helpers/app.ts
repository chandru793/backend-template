import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';

/**
 * Build a Fastify instance for testing.
 * - Logger disabled (no noise in test output)
 * - Uses env vars set by global-setup (testcontainers)
 */
export async function createTestApp(): Promise<FastifyInstance> {
  const app = await buildApp({
    serverOptions: {
      logger: false,
    },
  });

  await app.ready();
  return app;
}
