import type { PrismaClient, User } from '@prisma/client';
import { faker } from '@faker-js/faker';
import { hashPassword } from '../../src/services/password.service.js';

export const TEST_PASSWORD = 'TestPassword123!';

interface UserOverrides {
  email?: string;
  name?: string;
  password?: string;
  role?: 'USER' | 'ADMIN';
}

/**
 * Create a user in the database with hashed password.
 * Returns the created user (with hashed password — not the plain one).
 */
export async function createUser(prisma: PrismaClient, overrides: UserOverrides = {}): Promise<User> {
  const plainPassword = overrides.password ?? TEST_PASSWORD;

  return prisma.user.create({
    data: {
      email: overrides.email ?? faker.internet.email(),
      name: overrides.name ?? faker.person.fullName(),
      password: await hashPassword(plainPassword),
      role: overrides.role ?? 'USER',
    },
  });
}

/**
 * Build a valid user payload for POST /api/v1/users requests.
 */
export function buildUserPayload(overrides: UserOverrides = {}) {
  return {
    email: overrides.email ?? faker.internet.email(),
    name: overrides.name ?? faker.person.fullName(),
    password: overrides.password ?? TEST_PASSWORD,
    role: overrides.role ?? 'USER',
  };
}
