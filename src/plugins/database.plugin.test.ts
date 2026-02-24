import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { createTestApp } from '../../tests/helpers/app.js';

/**
 * These tests run the app in development mode to cover the branches
 * in database.plugin.ts that are gated on NODE_ENV === 'development':
 *
 *   - PrismaClient is configured with the extended dev log set
 *     (query + info + warn + error events)
 *   - prisma.$on('query', ...) and prisma.$on('info', ...) are registered
 *   - The query callback body is exercised when a DB query runs
 */
describe('database plugin - development mode', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    process.env.NODE_ENV = 'development';
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
    process.env.NODE_ENV = 'test';
  });

  it('starts up and responds to health check in development mode', async () => {
    // GET /health executes `prisma.$queryRaw`SELECT 1`` which fires the
    // $on('query') event, exercising the query log callback body.
    const response = await app.inject({ method: 'GET', url: '/health' });
    expect(response.statusCode).toBe(200);
    expect(response.json().status).toBe('healthy');
  });

  it('returns ready status (additional DB query to maximise query event coverage)', async () => {
    const response = await app.inject({ method: 'GET', url: '/health/ready' });
    expect(response.statusCode).toBe(200);
  });
});
