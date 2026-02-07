import type { FastifyBaseLogger } from 'fastify';
import type { LoggerOptions } from 'pino';

interface LogRequest {
  method: string;
  url: string;
  params: Record<string, unknown>;
  query: Record<string, unknown>;
  headers: Record<string, string | undefined>;
}

interface LogResponse {
  statusCode: number;
}

interface LogError {
  constructor: { name: string };
  message: string;
  stack?: string;
  code?: string;
}

/**
 * Create logger configuration based on environment
 */
function createLoggerConfig(): LoggerOptions {
  const baseConfig: LoggerOptions = {
    level: process.env.LOG_LEVEL ?? 'info',

    // Redact sensitive fields from logs
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'req.body.password',
        'req.body.confirmPassword',
        'req.body.currentPassword',
        'req.body.newPassword',
        'req.body.token',
        'req.body.refreshToken',
        'req.body.accessToken',
        'req.body.secret',
        'req.body.apiKey',
        'res.headers["set-cookie"]',
      ],
      censor: '[REDACTED]',
    },

    // Serializers for consistent formatting
    serializers: {
      req: (req: LogRequest) => ({
        method: req.method,
        url: req.url,
        params: req.params,
        query: req.query,
        headers: {
          host: req.headers.host,
          'user-agent': req.headers['user-agent'],
          'content-type': req.headers['content-type'],
        },
      }),
      res: (res: LogResponse) => ({
        statusCode: res.statusCode,
      }),
      err: (err: LogError) => ({
        type: err.constructor.name,
        message: err.message,
        stack: err.stack,
        code: err.code,
      }),
    },
  };

  // Add pretty printing in development
  if (process.env.NODE_ENV === 'development') {
    baseConfig.transport = {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    };
  }

  return baseConfig;
}

export const loggerConfig = createLoggerConfig();

export type AppLogger = FastifyBaseLogger;
