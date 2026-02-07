import { z } from 'zod';
import {
  createUserInput,
  updateUserInput,
  userResponse,
  userListItem,
  paginationQuery,
  idParam,
} from '../../../../schemas/validation/index.js';

/**
 * Route-specific schemas
 * Import and re-export shared schemas, add route-specific ones here
 */

// Request schemas
export const createUserSchema = {
  body: createUserInput,
  response: {
    201: userResponse,
  },
} as const;

export const updateUserSchema = {
  params: idParam,
  body: updateUserInput,
  response: {
    200: userResponse,
  },
} as const;

export const getUserSchema = {
  params: idParam,
  response: {
    200: userResponse,
  },
} as const;

export const listUsersSchema = {
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

export const deleteUserSchema = {
  params: idParam,
  response: {
    204: z.null(),
  },
} as const;
