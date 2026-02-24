import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { createTestApp } from '../helpers/app.js';

describe('Metrics endpoint', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /metrics returns 200 with Prometheus text format', async () => {
    const response = await app.inject({ method: 'GET', url: '/metrics' });
    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('text/plain');
  });

  it('GET /metrics body contains default process metrics', async () => {
    const response = await app.inject({ method: 'GET', url: '/metrics' });
    expect(response.body).toContain('# HELP process_cpu_user_seconds_total');
  });

  it('GET /metrics body contains circuit_breaker_state', async () => {
    const response = await app.inject({ method: 'GET', url: '/metrics' });
    expect(response.body).toContain('circuit_breaker_state');
  });

  it('GET /metrics body contains cache_hits_total', async () => {
    const response = await app.inject({ method: 'GET', url: '/metrics' });
    expect(response.body).toContain('cache_hits_total');
  });

  it('GET /metrics body contains queue_jobs', async () => {
    const response = await app.inject({ method: 'GET', url: '/metrics' });
    expect(response.body).toContain('queue_jobs');
  });
});

describe('Bull Board endpoint', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /queues returns 200 in non-production env', async () => {
    const response = await app.inject({ method: 'GET', url: '/queues' });
    expect(response.statusCode).toBe(200);
  });
});

describe('Error handler', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 400 with VALIDATION_ERROR for a Zod schema failure', async () => {
    // Sending an empty body triggers the Zod validation error path
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {},
    });
    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 404 for an unknown route', async () => {
    const response = await app.inject({ method: 'GET', url: '/nonexistent-route-xyz' });
    expect(response.statusCode).toBe(404);
    const body = response.json();
    expect(body.error.code).toBe('NOT_FOUND');
  });
});

describe('CORS policy', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('allows requests from the configured origin', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health/live',
      headers: { origin: 'http://localhost:3000' },
    });
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
  });

  it('does not echo back disallowed origins in CORS headers', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health/live',
      headers: { origin: 'https://disallowed.example.com' },
    });
    expect(response.headers['access-control-allow-origin']).not.toBe(
      'https://disallowed.example.com',
    );
  });
});

describe('Cache disabled mode', () => {
  let cachedisabledApp: FastifyInstance;

  beforeAll(async () => {
    process.env.CACHE_ENABLED = 'false';
    cachedisabledApp = await createTestApp();
  });

  afterAll(async () => {
    await cachedisabledApp.close();
    process.env.CACHE_ENABLED = 'true';
  });

  it('serves /health/live successfully with caching disabled', async () => {
    const response = await cachedisabledApp.inject({ method: 'GET', url: '/health/live' });
    expect(response.statusCode).toBe(200);
  });
});

describe('Swagger endpoints', () => {
  let swaggerApp: FastifyInstance;

  beforeAll(async () => {
    process.env.SWAGGER_ENABLED = 'true';
    swaggerApp = await createTestApp();
  });

  afterAll(async () => {
    await swaggerApp.close();
    process.env.SWAGGER_ENABLED = 'false';
  });

  it('GET /documentation returns 200', async () => {
    const response = await swaggerApp.inject({ method: 'GET', url: '/documentation' });
    expect(response.statusCode).toBe(200);
  });

  it('GET /documentation/json returns 200 with valid OpenAPI JSON', async () => {
    const response = await swaggerApp.inject({ method: 'GET', url: '/documentation/json' });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.openapi).toBe('3.1.0');
  });
});
