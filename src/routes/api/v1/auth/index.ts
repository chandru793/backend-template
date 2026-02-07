import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import {
  registerHandler,
  loginHandler,
  refreshHandler,
  logoutHandler,
  meHandler,
} from './handlers.js';
import { registerSchema, loginSchema, refreshSchema, logoutSchema, meSchema } from './schemas.js';
import { authenticate } from '../../../../middleware/auth.middleware.js';

/**
 * Auth routes
 * Prefix: /api/v1/auth
 *
 * Rate limiting applied per-route:
 * - register: 5 req/15min (prevent spam account creation)
 * - login: 5 req/15min with ban after 3x 429 (prevent brute force)
 * - refresh: 10 req/15min (prevent token farming)
 * - logout/me: global defaults
 */
const authRoutes: FastifyPluginAsyncZod = async (fastify) => {
  await Promise.resolve(); // Satisfy async requirement

  // Register - create new account (strict limit)
  fastify.post(
    '/register',
    {
      schema: registerSchema,
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '15 minutes',
        },
      },
    },
    registerHandler,
  );

  // Login - authenticate and get tokens (strict limit with ban)
  fastify.post(
    '/login',
    {
      schema: loginSchema,
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '15 minutes',
          ban: 3, // After 3 responses with 429, return 403 (ban)
        },
      },
    },
    loginHandler,
  );

  // Refresh - get new access token (moderate limit)
  fastify.post(
    '/refresh',
    {
      schema: refreshSchema,
      config: {
        rateLimit: {
          max: 10,
          timeWindow: '15 minutes',
        },
      },
    },
    refreshHandler,
  );

  // Logout - revoke refresh token (global defaults)
  fastify.post('/logout', { schema: logoutSchema }, logoutHandler);

  // Me - get current authenticated user (protected route, global defaults)
  fastify.get(
    '/me',
    {
      schema: meSchema,
      onRequest: [authenticate],
    },
    meHandler,
  );
};

export default authRoutes;
