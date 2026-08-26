import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    env: {
      NODE_ENV: 'test',
      JWT_ACCESS_SECRET: 'test-jwt-access-secret-for-vitest',
      JWT_REFRESH_SECRET: 'test-jwt-refresh-secret-for-vitest',
    },
    pool: 'forks',
    fileParallelism: true,
    testTimeout: 15_000,
  },
});
