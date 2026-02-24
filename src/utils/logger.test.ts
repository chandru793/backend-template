import { describe, it, expect, vi } from 'vitest';
import { loggerConfig } from './logger.js';

describe('loggerConfig', () => {
  it('has a log level set', () => {
    expect(typeof loggerConfig.level).toBe('string');
  });

  it('has redact configuration', () => {
    expect(loggerConfig.redact).toBeDefined();
  });

  it('has serializers defined', () => {
    expect(loggerConfig.serializers).toBeDefined();
  });
});

describe('req serializer', () => {
  const serialize = loggerConfig.serializers!.req!;

  it('returns method, url, params, query, and selected headers', () => {
    const result = serialize({
      method: 'GET',
      url: '/health',
      params: { id: '1' },
      query: { page: '2' },
      headers: {
        host: 'localhost',
        'user-agent': 'vitest',
        'content-type': 'application/json',
        authorization: 'Bearer token',
      },
    } as never);

    expect(result.method).toBe('GET');
    expect(result.url).toBe('/health');
    expect(result.params).toEqual({ id: '1' });
    expect(result.query).toEqual({ page: '2' });
    expect(result.headers.host).toBe('localhost');
    expect(result.headers['user-agent']).toBe('vitest');
    expect(result.headers['content-type']).toBe('application/json');
  });

  it('handles missing optional headers gracefully', () => {
    const result = serialize({
      method: 'POST',
      url: '/api',
      params: {},
      query: {},
      headers: {},
    } as never);

    expect(result.headers.host).toBeUndefined();
    expect(result.headers['user-agent']).toBeUndefined();
  });
});

describe('res serializer', () => {
  const serialize = loggerConfig.serializers!.res!;

  it('returns statusCode', () => {
    const result = serialize({ statusCode: 200 } as never);
    expect(result.statusCode).toBe(200);
  });
});

describe('err serializer', () => {
  const serialize = loggerConfig.serializers!.err!;

  it('returns type, message, stack, and code', () => {
    const result = serialize({
      constructor: { name: 'AppError' },
      message: 'Something went wrong',
      stack: 'Error: Something went wrong\n    at ...',
      code: 'APP_ERROR',
    } as never);

    expect(result.type).toBe('AppError');
    expect(result.message).toBe('Something went wrong');
    expect(result.stack).toContain('Something went wrong');
    expect(result.code).toBe('APP_ERROR');
  });

  it('handles an error without a code', () => {
    const result = serialize({
      constructor: { name: 'Error' },
      message: 'plain error',
    } as never);

    expect(result.type).toBe('Error');
    expect(result.code).toBeUndefined();
  });
});

describe('LOG_LEVEL env var', () => {
  it('uses the LOG_LEVEL env var when explicitly set', async () => {
    const originalLogLevel = process.env.LOG_LEVEL;
    process.env.LOG_LEVEL = 'debug';

    vi.resetModules();
    const { loggerConfig: customConfig } = await import('./logger.js');

    expect(customConfig.level).toBe('debug');

    process.env.LOG_LEVEL = originalLogLevel;
    vi.resetModules();
  });
});

describe('development mode transport', () => {
  it('includes pino-pretty transport when NODE_ENV is development', async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    vi.resetModules();
    const { loggerConfig: devConfig } = await import('./logger.js');

    expect(devConfig.transport).toBeDefined();
    expect((devConfig.transport as { target: string }).target).toBe('pino-pretty');

    process.env.NODE_ENV = originalNodeEnv;
    vi.resetModules();
  });
});
