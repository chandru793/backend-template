/**
 * Base application error class
 */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 400 Bad Request - Malformed request syntax
 */
export class BadRequestError extends AppError {
  constructor(message = 'Bad request') {
    super(400, message, 'BAD_REQUEST');
  }
}

/**
 * 400 Validation Error - Input validation failed
 */
export class ValidationError extends AppError {
  constructor(
    message: string,
    public readonly details?: Record<string, string>[],
  ) {
    super(400, message, 'VALIDATION_ERROR');
  }
}

/**
 * 401 Unauthorized - Authentication required
 */
export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(401, message, 'UNAUTHORIZED');
  }
}

/**
 * 403 Forbidden - Insufficient permissions
 */
export class ForbiddenError extends AppError {
  constructor(message = 'Access denied') {
    super(403, message, 'FORBIDDEN');
  }
}

/**
 * 404 Not Found - Resource not found
 */
export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(404, `${resource} not found`, 'NOT_FOUND');
  }
}

/**
 * 409 Conflict - Resource already exists
 */
export class ConflictError extends AppError {
  constructor(resource = 'Resource') {
    super(409, `${resource} already exists`, 'CONFLICT');
  }
}

/**
 * 422 Unprocessable Entity - Valid syntax but semantic validation failed
 */
export class UnprocessableEntityError extends AppError {
  constructor(
    message: string,
    public readonly details?: Record<string, string>[],
  ) {
    super(422, message, 'UNPROCESSABLE_ENTITY');
  }
}

/**
 * 429 Too Many Requests - Rate limit exceeded
 */
export class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(429, message, 'RATE_LIMITED');
  }
}

/**
 * 500 Internal Server Error
 */
export class InternalServerError extends AppError {
  constructor(message = 'Internal server error') {
    super(500, message, 'INTERNAL_ERROR');
  }
}

/**
 * 503 Service Unavailable - Dependency unavailable
 */
export class ServiceUnavailableError extends AppError {
  constructor(service = 'Service') {
    super(503, `${service} is temporarily unavailable`, 'SERVICE_UNAVAILABLE');
  }
}
