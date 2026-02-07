import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import {
  createUserHandler,
  getUserHandler,
  listUsersHandler,
  updateUserHandler,
  deleteUserHandler,
} from './handlers.js';
import {
  createUserSchema,
  getUserSchema,
  listUsersSchema,
  updateUserSchema,
  deleteUserSchema,
} from './schemas.js';

/**
 * User routes
 * Prefix: /api/v1/users
 */
const userRoutes: FastifyPluginAsyncZod = async (fastify) => {
  await Promise.resolve(); // Satisfy async requirement

  // Create user
  fastify.post('/', { schema: createUserSchema }, createUserHandler);

  // List users
  fastify.get('/', { schema: listUsersSchema }, listUsersHandler);

  // Get user by ID
  fastify.get('/:id', { schema: getUserSchema }, getUserHandler);

  // Update user
  fastify.patch('/:id', { schema: updateUserSchema }, updateUserHandler);

  // Delete user
  fastify.delete('/:id', { schema: deleteUserSchema }, deleteUserHandler);
};

export default userRoutes;
