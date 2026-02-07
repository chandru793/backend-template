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
 */
const authRoutes: FastifyPluginAsyncZod = async (fastify) => {
  await Promise.resolve(); // Satisfy async requirement

  // Register - create new account
  fastify.post('/register', { schema: registerSchema }, registerHandler);

  // Login - authenticate and get tokens
  fastify.post('/login', { schema: loginSchema }, loginHandler);

  // Refresh - get new access token
  fastify.post('/refresh', { schema: refreshSchema }, refreshHandler);

  // Logout - revoke refresh token
  fastify.post('/logout', { schema: logoutSchema }, logoutHandler);

  // Me - get current authenticated user (protected route)
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
