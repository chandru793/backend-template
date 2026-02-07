import type { FastifyInstance, FastifyPluginAsync, FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { hasZodFastifySchemaValidationErrors } from 'fastify-type-provider-zod';
import { AppError, ValidationError, UnprocessableEntityError } from '../utils/error.js';

/**
 * Format error response consistently
 */
function formatErrorResponse(code: string, message: string, details?: unknown) {
  const response: {
    error: {
      code: string;
      message: string;
      details?: unknown;
    };
  } = {
    error: {
      code,
      message,
    },
  };

  if (details) {
    response.error.details = details;
  }

  return response;
}

/**
 * Global error handler plugin
 */
const errorHandlerPlugin: FastifyPluginAsync = async (fastify: FastifyInstance): Promise<void> => {
  await Promise.resolve(); // Satisfy async requirement
  fastify.setErrorHandler(
    (error: FastifyError | Error, request: FastifyRequest, reply: FastifyReply) => {
      // Log error with context
      request.log.error({
        err: error,
        reqId: request.id,
        url: request.url,
        method: request.method,
      });

      // Handle custom application errors
      if (error instanceof AppError) {
        const details =
          error instanceof ValidationError || error instanceof UnprocessableEntityError
            ? error.details
            : undefined;

        return reply.code(error.statusCode).send(formatErrorResponse(error.code, error.message, details));
      }

      // Handle Zod validation errors (from fastify-type-provider-zod)
      if (hasZodFastifySchemaValidationErrors(error)) {
        const details = error.validation.map((issue) => ({
          field: issue.instancePath.replace(/^\//, '') || 'unknown',
          message: issue.message || 'Validation failed',
        }));

        return reply.code(400).send(formatErrorResponse('VALIDATION_ERROR', 'Validation failed', details));
      }

      // Handle Fastify validation errors
      if ('validation' in error && Array.isArray(error.validation)) {
        const details = error.validation.map((v: { instancePath: string; params?: { missingProperty?: string }; message?: string }) => ({
          field: v.instancePath.replace('/', '') || (v.params?.missingProperty ?? 'unknown'),
          message: v.message ?? 'Validation failed',
        }));

        return reply.code(400).send(formatErrorResponse('VALIDATION_ERROR', 'Validation failed', details));
      }

      // Handle HTTP errors with statusCode
      if ('statusCode' in error && typeof error.statusCode === 'number') {
        // Handle rate limit errors
        if (error.statusCode === 429) {
          return reply.code(429).send(formatErrorResponse('RATE_LIMITED', error.message || 'Too many requests'));
        }

        // Handle other HTTP errors
        const code = 'code' in error && typeof error.code === 'string' ? error.code : 'ERROR';
        return reply
          .code(error.statusCode)
          .send(formatErrorResponse(code, error.message || 'An error occurred'));
      }

      // Handle unknown errors - don't leak internal details
      const isProduction = process.env.NODE_ENV === 'production';
      const message = isProduction ? 'An unexpected error occurred' : error.message;

      return reply.code(500).send(formatErrorResponse('INTERNAL_ERROR', message));
    },
  );

  // Handle 404 Not Found
  fastify.setNotFoundHandler((request, reply) => {
    reply.code(404).send(formatErrorResponse('NOT_FOUND', `Route ${request.method} ${request.url} not found`));
  });
};

export default fp(errorHandlerPlugin, {
  name: 'error-handler',
});
