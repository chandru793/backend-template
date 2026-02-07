import {
  registerInput,
  loginInput,
  refreshInput,
  tokenResponse,
  currentUserResponse,
  messageResponse,
} from '../../../../schemas/validation/index.js';

/**
 * Auth route schemas
 */

// Register
export const registerSchema = {
  body: registerInput,
  response: {
    201: tokenResponse,
  },
} as const;

// Login
export const loginSchema = {
  body: loginInput,
  response: {
    200: tokenResponse,
  },
} as const;

// Refresh token
export const refreshSchema = {
  body: refreshInput,
  response: {
    200: tokenResponse,
  },
} as const;

// Logout
export const logoutSchema = {
  body: refreshInput,
  response: {
    200: messageResponse,
  },
} as const;

// Get current user
export const meSchema = {
  response: {
    200: currentUserResponse,
  },
} as const;
