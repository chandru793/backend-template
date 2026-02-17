import { z } from 'zod';
import {
  createUserInput,
  updateUserInput,
  userResponse,
  userListItem,
  paginationQuery,
  idParam,
  errorResponse,
} from '../../../../schemas/validation/index.js';

/**
 * Route-specific schemas with OpenAPI annotations
 */

export const createUserSchema = {
  tags: ['Users'],
  summary: 'Create a user',
  description: 'Create a new user account. Password is hashed with Argon2id.',
  body: createUserInput,
  response: {
    201: userResponse,
    400: errorResponse,
  },
} as const;

export const getUserSchema = {
  tags: ['Users'],
  summary: 'Get user by ID',
  description: 'Fetch a single user by UUID. Result is cached for 60 seconds.',
  params: idParam,
  response: {
    200: userResponse,
    404: errorResponse,
  },
} as const;

export const listUsersSchema = {
  tags: ['Users'],
  summary: 'List users',
  description: 'Paginated list of users.',
  querystring: paginationQuery,
  response: {
    200: z.object({
      data: z.array(userListItem),
      pagination: z.object({
        page: z.number(),
        limit: z.number(),
        total: z.number(),
      }),
    }),
  },
} as const;

export const updateUserSchema = {
  tags: ['Users'],
  summary: 'Update user',
  description: 'Update name or email. Cache is invalidated on success.',
  params: idParam,
  body: updateUserInput,
  response: {
    200: userResponse,
    404: errorResponse,
  },
} as const;

export const deleteUserSchema = {
  tags: ['Users'],
  summary: 'Delete user',
  description: 'Permanently delete a user. Cache is invalidated on success.',
  params: idParam,
  response: {
    204: z.null(),
    404: errorResponse,
  },
} as const;
