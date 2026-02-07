import { z } from 'zod';

/**
 * Base user schema - matches Prisma User model
 */
export const baseUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(2).max(100),
  role: z.enum(['USER', 'ADMIN']),
  createdAt: z.number(), // Unix timestamp in milliseconds
  updatedAt: z.number(),
});

/**
 * Create user input schema
 * Derived from base - omits auto-generated fields, adds password
 */
export const createUserInput = baseUserSchema
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({
    password: z.string().min(8).max(128),
  });

/**
 * Update user input schema
 * All fields optional except those that can't be updated
 */
export const updateUserInput = createUserInput.partial().omit({ password: true, role: true });

/**
 * User response schema
 * Never exposes password
 */
export const userResponse = baseUserSchema.omit({});

/**
 * User list item (minimal fields for list views)
 */
export const userListItem = baseUserSchema.pick({
  id: true,
  email: true,
  name: true,
  role: true,
});

// Type exports
export type CreateUserInput = z.infer<typeof createUserInput>;
export type UpdateUserInput = z.infer<typeof updateUserInput>;
export type UserResponse = z.infer<typeof userResponse>;
export type UserListItem = z.infer<typeof userListItem>;
