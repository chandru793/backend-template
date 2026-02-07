import { z } from 'zod';

/**
 * Auth schemas - validation for authentication endpoints
 */

/**
 * Register request - create new account
 */
export const registerInput = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(2).max(100),
});

/**
 * Login request - authenticate user
 */
export const loginInput = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/**
 * Refresh token request
 */
export const refreshInput = z.object({
  refreshToken: z.string().min(1),
});

/**
 * Token pair response
 */
export const tokenResponse = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    name: z.string(),
    role: z.enum(['USER', 'ADMIN']),
  }),
});

/**
 * Current user response (for /auth/me endpoint)
 */
export const currentUserResponse = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  role: z.enum(['USER', 'ADMIN']),
  createdAt: z.number(),
  updatedAt: z.number(),
});

// Type exports
export type RegisterInput = z.infer<typeof registerInput>;
export type LoginInput = z.infer<typeof loginInput>;
export type RefreshInput = z.infer<typeof refreshInput>;
export type TokenResponse = z.infer<typeof tokenResponse>;
export type CurrentUserResponse = z.infer<typeof currentUserResponse>;
