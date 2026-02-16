import type { FastifyReply, FastifyRequest } from 'fastify';
import type {
  RegisterInput,
  LoginInput,
  RefreshInput,
} from '../../../../schemas/validation/index.js';
import { hashPassword, verifyPassword } from '../../../../services/password.service.js';
import {
  generateTokenPair,
  revokeRefreshToken,
  rotateRefreshToken,
} from '../../../../services/token.service.js';
import { UnauthorizedError, ConflictError } from '../../../../utils/error.js';

/**
 * Register a new user
 */
export async function registerHandler(
  this: FastifyRequest['server'],
  request: FastifyRequest<{ Body: RegisterInput }>,
  reply: FastifyReply,
) {
  const { email, password, name } = request.body;

  // Check if user already exists
  const existingUser = await this.prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new ConflictError('User with this email already exists');
  }

  // Hash password
  const hashedPassword = await hashPassword(password);

  // Create user
  const user = await this.prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
      role: 'USER', // Default role
    },
  });

  // Generate tokens
  const tokens = await generateTokenPair(this, user.id, user.email, user.role);

  return reply.code(201).send({
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  });
}

/**
 * Login user
 */
export async function loginHandler(
  this: FastifyRequest['server'],
  request: FastifyRequest<{ Body: LoginInput }>,
  reply: FastifyReply,
) {
  const { email, password } = request.body;

  // Find user
  const user = await this.prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new UnauthorizedError('Invalid email or password');
  }

  // Verify password
  const isValidPassword = await verifyPassword(user.password, password);

  if (!isValidPassword) {
    throw new UnauthorizedError('Invalid email or password');
  }

  // Generate tokens
  const tokens = await generateTokenPair(this, user.id, user.email, user.role);

  return reply.send({
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  });
}

/**
 * Refresh access token
 */
export async function refreshHandler(
  this: FastifyRequest['server'],
  request: FastifyRequest<{ Body: RefreshInput }>,
  reply: FastifyReply,
) {
  const { refreshToken } = request.body;

  try {
    // Rotate refresh token (revokes old one, issues new pair)
    const result = await rotateRefreshToken(this, refreshToken);

    // Get user details
    const user = await this.prisma.user.findUnique({
      where: { id: result.userId },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    return await reply.send({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch {
    throw new UnauthorizedError('Invalid refresh token');
  }
}

/**
 * Logout user (revoke refresh token)
 */
export async function logoutHandler(
  this: FastifyRequest['server'],
  request: FastifyRequest<{ Body: RefreshInput }>,
  reply: FastifyReply,
) {
  const { refreshToken } = request.body;

  try {
    // Verify refresh token to get user ID
    const decoded = this.jwt.verify<{ userId: string; type?: string }>(refreshToken);

    // Revoke the refresh token
    await revokeRefreshToken(this, decoded.userId, refreshToken);

    return await reply.send({
      message: 'Logged out successfully',
    });
  } catch {
    // Even if token is invalid, return success (idempotent)
    return await reply.send({
      message: 'Logged out successfully',
    });
  }
}

/**
 * Get current authenticated user
 */
export async function meHandler(
  this: FastifyRequest['server'],
  request: FastifyRequest,
  reply: FastifyReply,
) {
  // User is already authenticated via onRequest hook
  const currentUser = request.user as { userId: string; email: string; role: string } | undefined;

  if (!currentUser) {
    throw new UnauthorizedError('Not authenticated');
  }

  const user = await this.prisma.user.findUnique({
    where: { id: currentUser.userId },
  });

  if (!user) {
    throw new UnauthorizedError('User not found');
  }

  return reply.send({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: new Date(user.createdAt).getTime(),
    updatedAt: new Date(user.updatedAt).getTime(),
  });
}
