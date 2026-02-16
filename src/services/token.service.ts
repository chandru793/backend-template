import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { hashPassword } from './password.service.js';

/**
 * Token service - manages JWT and refresh tokens
 */

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

/**
 * Generate access and refresh token pair
 */
export async function generateTokenPair(
  fastify: FastifyInstance,
  userId: string,
  email: string,
  role: string,
): Promise<TokenPair> {
  // Generate access token (15 minutes - uses default from plugin)
  const accessToken = fastify.jwt.sign({
    userId,
    email,
    role,
  });

  // Generate refresh token (7 days - override default expiry)
  // jti (JWT ID) ensures uniqueness even when issued within the same second
  const refreshToken = fastify.jwt.sign(
    {
      userId,
      type: 'refresh', // Mark as refresh token
      jti: randomUUID(),
    },
    {
      expiresIn: '7d',
    },
  );

  // Store refresh token in database (hashed)
  const hashedToken = await hashPassword(refreshToken);

  await fastify.prisma.refreshToken.create({
    data: {
      token: hashedToken,
      userId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
  });

  return {
    accessToken,
    refreshToken,
  };
}

/**
 * Revoke a refresh token
 */
export async function revokeRefreshToken(
  fastify: FastifyInstance,
  userId: string,
  token: string,
): Promise<void> {
  // Find and delete matching refresh tokens for this user
  // Since tokens are hashed, we need to verify each one
  const userTokens = await fastify.prisma.refreshToken.findMany({
    where: {
      userId,
      expiresAt: { gt: new Date() },
    },
  });

  // Verify the provided token against stored hashed tokens
  const { verifyPassword } = await import('./password.service.js');

  for (const storedToken of userTokens) {
    const isMatch = await verifyPassword(storedToken.token, token);
    if (isMatch) {
      await fastify.prisma.refreshToken.delete({
        where: { id: storedToken.id },
      });
      return;
    }
  }
}

/**
 * Revoke all refresh tokens for a user
 */
export async function revokeAllUserTokens(fastify: FastifyInstance, userId: string): Promise<void> {
  await fastify.prisma.refreshToken.deleteMany({
    where: { userId },
  });
}

/**
 * Validate and rotate refresh token
 * Returns new token pair if valid, throws error if invalid
 */
export async function rotateRefreshToken(
  fastify: FastifyInstance,
  refreshToken: string,
): Promise<TokenPair & { userId: string; email: string; role: string }> {
  // Verify refresh token signature
  const decoded = fastify.jwt.verify<{ userId: string; type?: string }>(refreshToken);

  // Get user
  const user = await fastify.prisma.user.findUnique({
    where: { id: decoded.userId },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Verify token exists in database (check against hashed tokens)
  const userTokens = await fastify.prisma.refreshToken.findMany({
    where: {
      userId: user.id,
      expiresAt: { gt: new Date() },
    },
  });

  const { verifyPassword } = await import('./password.service.js');
  let tokenFound = false;

  for (const storedToken of userTokens) {
    const isMatch = await verifyPassword(storedToken.token, refreshToken);
    if (isMatch) {
      // Revoke old token
      await fastify.prisma.refreshToken.delete({
        where: { id: storedToken.id },
      });
      tokenFound = true;
      break;
    }
  }

  if (!tokenFound) {
    throw new Error('Invalid refresh token');
  }

  // Generate new token pair
  const tokens = await generateTokenPair(fastify, user.id, user.email, user.role);

  return {
    ...tokens,
    userId: user.id,
    email: user.email,
    role: user.role,
  };
}
