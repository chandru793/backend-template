import {
  registerInput,
  loginInput,
  refreshInput,
  tokenResponse,
  currentUserResponse,
  messageResponse,
  errorResponse,
} from '../../../../schemas/validation/index.js';

/**
 * Auth route schemas with OpenAPI annotations
 */

export const registerSchema = {
  tags: ['Auth'],
  summary: 'Register',
  description: 'Create a new account. Returns a JWT access + refresh token pair.',
  body: registerInput,
  response: {
    201: tokenResponse,
    400: errorResponse,
    409: errorResponse,
  },
} as const;

export const loginSchema = {
  tags: ['Auth'],
  summary: 'Login',
  description: 'Authenticate with email and password. Returns a JWT access + refresh token pair.',
  body: loginInput,
  response: {
    200: tokenResponse,
    401: errorResponse,
  },
} as const;

export const refreshSchema = {
  tags: ['Auth'],
  summary: 'Refresh tokens',
  description:
    'Exchange a valid refresh token for a new access + refresh token pair (rotation). The old refresh token is invalidated.',
  body: refreshInput,
  response: {
    200: tokenResponse,
    401: errorResponse,
  },
} as const;

export const logoutSchema = {
  tags: ['Auth'],
  summary: 'Logout',
  description: 'Revoke the refresh token. Always returns 200 (idempotent).',
  body: refreshInput,
  response: {
    200: messageResponse,
  },
} as const;

export const meSchema = {
  tags: ['Auth'],
  summary: 'Get current user',
  description: 'Returns the authenticated user profile. Requires Bearer token.',
  security: [{ bearerAuth: [] }],
  response: {
    200: currentUserResponse,
    401: errorResponse,
  },
} as const;
