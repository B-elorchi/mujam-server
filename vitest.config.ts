import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    env: {
      NODE_ENV: 'test',
    },
    pool: 'forks',
    fileParallelism: true,
    testTimeout: 15_000,
  },
});
