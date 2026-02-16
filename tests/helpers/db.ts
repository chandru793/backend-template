import { PrismaClient } from '@prisma/client';

/**
 * Clean all tables in the correct FK order between tests.
 * Call in beforeEach to guarantee a clean slate.
 */
export async function cleanDatabase(prisma: PrismaClient): Promise<void> {
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
}
