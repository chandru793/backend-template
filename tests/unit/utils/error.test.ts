import { describe, it, expect } from 'vitest';
import {
  AppError,
  BadRequestError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  UnprocessableEntityError,
  RateLimitError,
  InternalServerError,
  ServiceUnavailableError,
} from '../../../src/utils/error.js';

describe('AppError', () => {
  it('sets statusCode, message, code, and name', () => {
    const err = new AppError(418, "I'm a teapot", 'TEAPOT');
    expect(err.statusCode).toBe(418);
    expect(err.message).toBe("I'm a teapot");
    expect(err.code).toBe('TEAPOT');
    expect(err.name).toBe('AppError');
  });

  it('is an instance of Error', () => {
    const err = new AppError(500, 'boom', 'BOOM');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
  });
});

describe('BadRequestError', () => {
  it('uses default message and statusCode 400', () => {
    const err = new BadRequestError();
    expect(err.statusCode).toBe(400);
    expect(err.message).toBe('Bad request');
    expect(err.code).toBe('BAD_REQUEST');
  });

  it('accepts a custom message', () => {
    const err = new BadRequestError('missing field');
    expect(err.message).toBe('missing field');
    expect(err.statusCode).toBe(400);
  });
});

describe('ValidationError', () => {
  it('sets message, code, and statusCode 400', () => {
    const err = new ValidationError('invalid input');
    expect(err.statusCode).toBe(400);
    expect(err.message).toBe('invalid input');
    expect(err.code).toBe('VALIDATION_ERROR');
  });

  it('stores details when provided', () => {
    const details = [{ field: 'email must be valid' }];
    const err = new ValidationError('invalid', details);
    expect(err.details).toEqual(details);
  });

  it('has undefined details when not provided', () => {
    const err = new ValidationError('invalid');
    expect(err.details).toBeUndefined();
  });
});

describe('UnauthorizedError', () => {
  it('uses default message and statusCode 401', () => {
    const err = new UnauthorizedError();
    expect(err.statusCode).toBe(401);
    expect(err.message).toBe('Authentication required');
    expect(err.code).toBe('UNAUTHORIZED');
  });

  it('accepts a custom message', () => {
    const err = new UnauthorizedError('token expired');
    expect(err.message).toBe('token expired');
  });
});

describe('ForbiddenError', () => {
  it('uses default message and statusCode 403', () => {
    const err = new ForbiddenError();
    expect(err.statusCode).toBe(403);
    expect(err.message).toBe('Access denied');
    expect(err.code).toBe('FORBIDDEN');
  });

  it('accepts a custom message', () => {
    const err = new ForbiddenError('not allowed');
    expect(err.message).toBe('not allowed');
  });
});

describe('NotFoundError', () => {
  it('uses "Resource not found" as default message', () => {
    const err = new NotFoundError();
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe('Resource not found');
    expect(err.code).toBe('NOT_FOUND');
  });

  it('uses the custom resource name in the message', () => {
    const err = new NotFoundError('User');
    expect(err.message).toBe('User not found');
  });
});

describe('ConflictError', () => {
  it('uses "Resource already exists" as default message', () => {
    const err = new ConflictError();
    expect(err.statusCode).toBe(409);
    expect(err.message).toBe('Resource already exists');
    expect(err.code).toBe('CONFLICT');
  });

  it('uses the custom resource name in the message', () => {
    const err = new ConflictError('Email');
    expect(err.message).toBe('Email already exists');
  });
});

describe('UnprocessableEntityError', () => {
  it('sets message, code, and statusCode 422', () => {
    const err = new UnprocessableEntityError('semantic error');
    expect(err.statusCode).toBe(422);
    expect(err.message).toBe('semantic error');
    expect(err.code).toBe('UNPROCESSABLE_ENTITY');
  });

  it('stores details when provided', () => {
    const details = [{ field: 'value must be positive' }];
    const err = new UnprocessableEntityError('invalid', details);
    expect(err.details).toEqual(details);
  });
});

describe('RateLimitError', () => {
  it('uses default message and statusCode 429', () => {
    const err = new RateLimitError();
    expect(err.statusCode).toBe(429);
    expect(err.message).toBe('Too many requests');
    expect(err.code).toBe('RATE_LIMITED');
  });
});

describe('InternalServerError', () => {
  it('uses default message and statusCode 500', () => {
    const err = new InternalServerError();
    expect(err.statusCode).toBe(500);
    expect(err.message).toBe('Internal server error');
    expect(err.code).toBe('INTERNAL_ERROR');
  });
});

describe('ServiceUnavailableError', () => {
  it('uses "Service is temporarily unavailable" as default message', () => {
    const err = new ServiceUnavailableError();
    expect(err.statusCode).toBe(503);
    expect(err.message).toBe('Service is temporarily unavailable');
    expect(err.code).toBe('SERVICE_UNAVAILABLE');
  });

  it('uses the custom service name in the message', () => {
    const err = new ServiceUnavailableError('Database');
    expect(err.message).toBe('Database is temporarily unavailable');
  });
});
