import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { RedisContainer, type StartedRedisContainer } from '@testcontainers/redis';
import { execSync } from 'node:child_process';

let pgContainer: StartedPostgreSqlContainer;
let redisContainer: StartedRedisContainer;

export async function setup(): Promise<void> {
  console.log('\n🐳 Starting test containers...');

  // Start PostgreSQL and Redis in parallel
  [pgContainer, redisContainer] = await Promise.all([
    new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('test_db')
      .withUsername('test')
      .withPassword('test')
      .start(),

    new RedisContainer('redis:7-alpine').start(),
  ]);

  // Set env vars for all test processes (inherited by forks)
  process.env.DATABASE_URL = pgContainer.getConnectionUri();
  process.env.REDIS_HOST = redisContainer.getHost();
  process.env.REDIS_PORT = String(redisContainer.getPort());
  process.env.REDIS_PASSWORD = '';
  process.env.REDIS_DB = '0';
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-secret-key-for-testing-only';
  process.env.CACHE_ENABLED = 'true';
  process.env.SWAGGER_ENABLED = 'false';

  // Run migrations against the test database
  execSync('pnpm prisma migrate deploy', {
    env: process.env,
    stdio: 'pipe',
  });

  console.log('✅ Test containers ready');
  console.log(`   PostgreSQL: ${pgContainer.getConnectionUri()}`);
  console.log(`   Redis: ${redisContainer.getHost()}:${redisContainer.getPort()}`);
}

export async function teardown(): Promise<void> {
  console.log('\n🛑 Stopping test containers...');
  await Promise.all([pgContainer?.stop(), redisContainer?.stop()]);
  console.log('✅ Test containers stopped');
}
