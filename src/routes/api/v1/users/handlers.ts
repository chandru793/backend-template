import type { FastifyReply, FastifyRequest } from 'fastify';
import type {
  CreateUserInput,
  UpdateUserInput,
  PaginationQuery,
  IdParam,
} from '../../../../schemas/validation/index.js';
import { NotFoundError } from '../../../../utils/error.js';
import { hashPassword } from '../../../../services/password.service.js';

/**
 * Create a new user
 */
export async function createUserHandler(
  this: FastifyRequest['server'],
  request: FastifyRequest<{ Body: CreateUserInput }>,
  reply: FastifyReply,
) {
  const { email, name, role, password } = request.body;

  // Hash password with Argon2
  const hashedPassword = await hashPassword(password);

  const user = await this.prisma.user.create({
    data: {
      email,
      name,
      role,
      password: hashedPassword,
    },
  });

  // Convert Date to Unix timestamp (milliseconds)
  const response = {
    ...user,
    createdAt: user.createdAt.getTime(),
    updatedAt: user.updatedAt.getTime(),
  };

  return reply.code(201).send(response);
}

/**
 * Get user by ID
 */
export async function getUserHandler(
  this: FastifyRequest['server'],
  request: FastifyRequest<{ Params: IdParam }>,
  reply: FastifyReply,
) {
  const { id } = request.params;

  const user = await this.prisma.user.findUnique({
    where: { id },
  });

  if (!user) {
    throw new NotFoundError(`User with ID ${id}`);
  }

  const response = {
    ...user,
    createdAt: user.createdAt.getTime(),
    updatedAt: user.updatedAt.getTime(),
  };

  return reply.send(response);
}

/**
 * List users with pagination
 */
export async function listUsersHandler(
  this: FastifyRequest['server'],
  request: FastifyRequest<{ Querystring: PaginationQuery }>,
  reply: FastifyReply,
) {
  const { page, limit } = request.query;
  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    this.prisma.user.count(),
  ]);

  return reply.send({
    data: users,
    pagination: {
      page,
      limit,
      total,
    },
  });
}

/**
 * Update user by ID
 */
export async function updateUserHandler(
  this: FastifyRequest['server'],
  request: FastifyRequest<{ Params: IdParam; Body: UpdateUserInput }>,
  reply: FastifyReply,
) {
  const { id } = request.params;
  const { email, name } = request.body;

  // Check if user exists
  const existingUser = await this.prisma.user.findUnique({
    where: { id },
  });

  if (!existingUser) {
    throw new NotFoundError(`User with ID ${id}`);
  }

  const user = await this.prisma.user.update({
    where: { id },
    data: {
      ...(email && { email }),
      ...(name && { name }),
    },
  });

  const response = {
    ...user,
    createdAt: user.createdAt.getTime(),
    updatedAt: user.updatedAt.getTime(),
  };

  return reply.send(response);
}

/**
 * Delete user by ID
 */
export async function deleteUserHandler(
  this: FastifyRequest['server'],
  request: FastifyRequest<{ Params: IdParam }>,
  reply: FastifyReply,
) {
  const { id } = request.params;

  // Check if user exists
  const existingUser = await this.prisma.user.findUnique({
    where: { id },
  });

  if (!existingUser) {
    throw new NotFoundError(`User with ID ${id}`);
  }

  await this.prisma.user.delete({
    where: { id },
  });

  return reply.code(204).send();
}
