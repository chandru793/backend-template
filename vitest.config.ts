import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    globalSetup: ['./tests/global-setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.test.ts',
        '**/*.d.ts',
        'tests/helpers/**',
        'tests/factories/**',
        'tests/global-setup.ts',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
    testTimeout: 30000,
    hookTimeout: 60000, // Testcontainers can be slow on first pull
    teardownTimeout: 30000,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true, // Prevents race conditions with shared DB
        execArgv: ['--import', 'tsx/esm'], // Enables .ts dynamic imports via autoload
      },
    },
  },
});
