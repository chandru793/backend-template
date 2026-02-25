import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 1,
};

async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, ARGON2_OPTIONS);
}

async function main() {
  console.log('🌱 Seeding database...');

  // ─── Admin user ────────────────────────────────────────────────────────────
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'Admin User',
      password: await hashPassword('Admin@123456'),
      role: 'ADMIN',
    },
  });
  console.log(`✅ Admin user: ${admin.email}`);

  // ─── Regular users ─────────────────────────────────────────────────────────
  const users = [
    { email: 'alice@example.com', name: 'Alice Johnson' },
    { email: 'bob@example.com', name: 'Bob Smith' },
    { email: 'carol@example.com', name: 'Carol Williams' },
  ];

  for (const { email, name } of users) {
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        name,
        password: await hashPassword('Password@123456'),
        role: 'USER',
      },
    });
    console.log(`✅ User: ${user.email}`);
  }

  console.log('\n🎉 Seeding complete.');
  console.log('\nSeeded accounts:');
  console.log('  Admin  → admin@example.com   / Admin@123456');
  console.log('  Users  → alice@example.com   / Password@123456');
  console.log('           bob@example.com     / Password@123456');
  console.log('           carol@example.com   / Password@123456');
}

main()
  .catch((err) => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
