import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { z } from 'zod';
import errorHandlerPlugin from '../../../src/plugins/errorHandler.plugin.js';
import {
  BadRequestError,
  ValidationError,
  UnprocessableEntityError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  InternalServerError,
  ServiceUnavailableError,
} from '../../../src/utils/error.js';

/**
 * Error Handler Plugin Tests
 *
 * Uses a minimal Fastify app (no DB/Redis) with only the error handler plugin
 * registered plus one test route per error branch. Verifies every code path in
 * errorHandler.plugin.ts:
 *
 *   - Each AppError subclass → correct statusCode, code, message
 *   - ValidationError / UnprocessableEntityError → details array included
 *   - Generic HTTP errors with statusCode → proxied through
 *   - Rate limit HTTP error (429) → RATE_LIMITED code
 *   - Unknown errors in dev → real message exposed
 *   - Unknown errors in production → message masked
 *   - 404 not found handler → NOT_FOUND code with route in message
 */

async function createErrorTestApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });

  await app.register(errorHandlerPlugin);

  // ─── One route per AppError subclass ──────────────────────────────────────
  app.get('/err/bad-request', () => {
    throw new BadRequestError('bad input');
  });

  app.get('/err/validation-error', () => {
    throw new ValidationError('invalid data', [{ field: 'email', message: 'required' }]);
  });

  app.get('/err/unprocessable', () => {
    throw new UnprocessableEntityError('cannot process', [{ field: 'name', message: 'too long' }]);
  });

  app.get('/err/unauthorized', () => {
    throw new UnauthorizedError();
  });

  app.get('/err/forbidden', () => {
    throw new ForbiddenError();
  });

  app.get('/err/not-found-error', () => {
    throw new NotFoundError('User');
  });

  app.get('/err/conflict', () => {
    throw new ConflictError('Email');
  });

  app.get('/err/rate-limit-app', () => {
    throw new RateLimitError();
  });

  app.get('/err/internal', () => {
    throw new InternalServerError();
  });

  app.get('/err/service-unavailable', () => {
    throw new ServiceUnavailableError('Redis');
  });

  // ─── Generic HTTP error with statusCode ───────────────────────────────────
  app.get('/err/http-generic', () => {
    const e = Object.assign(new Error('Downstream failed'), {
      statusCode: 502,
      code: 'DOWNSTREAM_ERROR',
    });
    throw e;
  });

  // ─── HTTP 429 without AppError (Fastify rate-limit plugin shape) ──────────
  app.get('/err/http-429', () => {
    const e = Object.assign(new Error('Too many requests'), { statusCode: 429 });
    throw e;
  });

  // ─── Unknown error (no statusCode, not AppError) ──────────────────────────
  app.get('/err/unknown', () => {
    throw new Error('raw unexpected error');
  });

  await app.ready();
  return app;
}

// ─── AppError subclasses ──────────────────────────────────────────────────────

describe('AppError subclasses', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createErrorTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('BadRequestError → 400 BAD_REQUEST', async () => {
    const res = await app.inject({ method: 'GET', url: '/err/bad-request' });
    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.error.code).toBe('BAD_REQUEST');
    expect(body.error.message).toBe('bad input');
  });

  it('UnauthorizedError → 401 UNAUTHORIZED', async () => {
    const res = await app.inject({ method: 'GET', url: '/err/unauthorized' });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('UNAUTHORIZED');
  });

  it('ForbiddenError → 403 FORBIDDEN', async () => {
    const res = await app.inject({ method: 'GET', url: '/err/forbidden' });
    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe('FORBIDDEN');
  });

  it('NotFoundError → 404 NOT_FOUND with resource name in message', async () => {
    const res = await app.inject({ method: 'GET', url: '/err/not-found-error' });
    expect(res.statusCode).toBe(404);
    const body = res.json();
    expect(body.error.code).toBe('NOT_FOUND');
    expect(body.error.message).toContain('User');
  });

  it('ConflictError → 409 CONFLICT with resource name in message', async () => {
    const res = await app.inject({ method: 'GET', url: '/err/conflict' });
    expect(res.statusCode).toBe(409);
    const body = res.json();
    expect(body.error.code).toBe('CONFLICT');
    expect(body.error.message).toContain('Email');
  });

  it('RateLimitError → 429 RATE_LIMITED', async () => {
    const res = await app.inject({ method: 'GET', url: '/err/rate-limit-app' });
    expect(res.statusCode).toBe(429);
    expect(res.json().error.code).toBe('RATE_LIMITED');
  });

  it('InternalServerError → 500 INTERNAL_ERROR', async () => {
    const res = await app.inject({ method: 'GET', url: '/err/internal' });
    expect(res.statusCode).toBe(500);
    expect(res.json().error.code).toBe('INTERNAL_ERROR');
  });

  it('ServiceUnavailableError → 503 SERVICE_UNAVAILABLE with service name in message', async () => {
    const res = await app.inject({ method: 'GET', url: '/err/service-unavailable' });
    expect(res.statusCode).toBe(503);
    const body = res.json();
    expect(body.error.code).toBe('SERVICE_UNAVAILABLE');
    expect(body.error.message).toContain('Redis');
  });
});

// ─── Errors with details ──────────────────────────────────────────────────────

describe('errors with details array', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createErrorTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('ValidationError → 400 with details array', async () => {
    const res = await app.inject({ method: 'GET', url: '/err/validation-error' });
    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.message).toBe('invalid data');
    expect(Array.isArray(body.error.details)).toBe(true);
    expect(body.error.details[0]).toMatchObject({ field: 'email', message: 'required' });
  });

  it('UnprocessableEntityError → 422 with details array', async () => {
    const res = await app.inject({ method: 'GET', url: '/err/unprocessable' });
    expect(res.statusCode).toBe(422);
    const body = res.json();
    expect(body.error.code).toBe('UNPROCESSABLE_ENTITY');
    expect(Array.isArray(body.error.details)).toBe(true);
    expect(body.error.details[0]).toMatchObject({ field: 'name', message: 'too long' });
  });
});

// ─── Generic HTTP errors ──────────────────────────────────────────────────────

describe('generic HTTP errors with statusCode', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createErrorTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('HTTP error with statusCode + code → proxied through', async () => {
    const res = await app.inject({ method: 'GET', url: '/err/http-generic' });
    expect(res.statusCode).toBe(502);
    const body = res.json();
    expect(body.error.code).toBe('DOWNSTREAM_ERROR');
    expect(body.error.message).toBe('Downstream failed');
  });

  it('HTTP 429 without AppError → RATE_LIMITED code', async () => {
    const res = await app.inject({ method: 'GET', url: '/err/http-429' });
    expect(res.statusCode).toBe(429);
    expect(res.json().error.code).toBe('RATE_LIMITED');
  });
});

// ─── Unknown errors ───────────────────────────────────────────────────────────

describe('unknown errors', () => {
  it('exposes the real message in development mode', async () => {
    process.env.NODE_ENV = 'development';
    const app = await createErrorTestApp();
    const res = await app.inject({ method: 'GET', url: '/err/unknown' });
    await app.close();
    process.env.NODE_ENV = 'test';

    expect(res.statusCode).toBe(500);
    const body = res.json();
    expect(body.error.code).toBe('INTERNAL_ERROR');
    expect(body.error.message).toBe('raw unexpected error');
  });

  it('masks the message in production mode', async () => {
    process.env.NODE_ENV = 'production';
    const app = await createErrorTestApp();
    const res = await app.inject({ method: 'GET', url: '/err/unknown' });
    await app.close();
    process.env.NODE_ENV = 'test';

    expect(res.statusCode).toBe(500);
    const body = res.json();
    expect(body.error.code).toBe('INTERNAL_ERROR');
    expect(body.error.message).toBe('An unexpected error occurred');
  });
});

// ─── 404 not found handler ────────────────────────────────────────────────────

describe('404 not found handler', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createErrorTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 404 NOT_FOUND for an unregistered route', async () => {
    const res = await app.inject({ method: 'GET', url: '/does-not-exist' });
    expect(res.statusCode).toBe(404);
    const body = res.json();
    expect(body.error.code).toBe('NOT_FOUND');
    expect(body.error.message).toContain('GET');
    expect(body.error.message).toContain('/does-not-exist');
  });

  it('includes the HTTP method in the not-found message', async () => {
    const res = await app.inject({ method: 'POST', url: '/no-such-route' });
    expect(res.statusCode).toBe(404);
    expect(res.json().error.message).toContain('POST');
  });
});

// ─── Zod validation errors (fastify-type-provider-zod) ───────────────────────

async function createZodTestApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });

  // Must register Zod compilers before the error handler so that
  // hasZodFastifySchemaValidationErrors() recognises the errors
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(errorHandlerPlugin);

  app.post(
    '/zod/validate',
    {
      schema: {
        body: z.object({
          email: z.string().email(),
          name: z.string().min(1),
        }),
      },
    },
    () => ({ ok: true }),
  );

  await app.ready();
  return app;
}

describe('Zod schema validation errors', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createZodTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 400 VALIDATION_ERROR with details array for invalid body', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/zod/validate',
      payload: { email: 'not-an-email', name: '' },
    });
    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.message).toBe('Validation failed');
    expect(Array.isArray(body.error.details)).toBe(true);
  });

  it('returns 400 VALIDATION_ERROR when required fields are missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/zod/validate',
      payload: {},
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('VALIDATION_ERROR');
  });

  it('details array contains field and message for each invalid field', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/zod/validate',
      payload: { email: 'bad', name: 'ok' },
    });
    const details = res.json().error.details as { field: string; message: string }[];
    expect(details.length).toBeGreaterThan(0);
    expect(details[0]).toHaveProperty('field');
    expect(details[0]).toHaveProperty('message');
  });
});

// ─── Fastify native (AJV) validation errors ───────────────────────────────────

async function createAjvTestApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });

  // Register error handler WITHOUT Zod — uses Fastify's built-in AJV validation
  await app.register(errorHandlerPlugin);

  app.post(
    '/ajv/validate',
    {
      schema: {
        body: {
          type: 'object',
          required: ['email', 'name'],
          properties: {
            email: { type: 'string', format: 'email' },
            name: { type: 'string', minLength: 1 },
          },
        },
      },
    },
    () => ({ ok: true }),
  );

  await app.ready();
  return app;
}

describe('Fastify native (AJV) validation errors', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createAjvTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 400 VALIDATION_ERROR when required fields are missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/ajv/validate',
      payload: {},
    });
    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.message).toBe('Validation failed');
  });

  it('details array contains field and message for each missing field', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/ajv/validate',
      payload: {},
    });
    const details = res.json().error.details as { field: string; message: string }[];
    expect(Array.isArray(details)).toBe(true);
    expect(details.length).toBeGreaterThan(0);
    expect(details[0]).toHaveProperty('field');
    expect(details[0]).toHaveProperty('message');
  });

  it('returns 400 VALIDATION_ERROR for wrong field type', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/ajv/validate',
      payload: { email: 123, name: 'ok' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('VALIDATION_ERROR');
  });
});
