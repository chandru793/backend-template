import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { createTestApp } from '../../../tests/helpers/app.js';

describe('Health Routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /health', () => {
    it('returns 200 with healthy status and checks', async () => {
      const response = await app.inject({ method: 'GET', url: '/health' });

      expect(response.statusCode).toBe(200);

      const body = response.json();
      expect(body.status).toBe('healthy');
      expect(body.checks.database.status).toBe('healthy');
      expect(body.checks.redis.status).toBe('healthy');
      expect(typeof body.uptime).toBe('number');
      expect(typeof body.timestamp).toBe('number');
    });
  });

  describe('GET /health/live', () => {
    it('returns 200 with healthy status', async () => {
      const response = await app.inject({ method: 'GET', url: '/health/live' });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({ status: 'healthy' });
    });
  });

  describe('GET /health/ready', () => {
    it('returns 200 with healthy status', async () => {
      const response = await app.inject({ method: 'GET', url: '/health/ready' });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({ status: 'healthy' });
    });
  });
});
