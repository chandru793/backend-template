import type { FastifyRequest, FastifyReply } from 'fastify';
import { UnauthorizedError } from '../utils/error.js';

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
export async function authenticate(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  try {
    // Verify JWT token (from Authorization header)
    await request.jwtVerify();

    // Token payload is automatically attached to request.user by @fastify/jwt
    // Type is defined in src/types/fastify.d.ts
  } catch {
    throw new UnauthorizedError('Invalid or expired token');
  }
}

/**
 * Optional authentication middleware
 * Verifies token if present, but doesn't require it
 */
export async function optionalAuthenticate(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  try {
    await request.jwtVerify();
  } catch {
    // If token verification fails, continue without user
  }
}
