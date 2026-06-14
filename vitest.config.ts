import 'dotenv/config';
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/__tests__/**/*.test.ts'],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // Run test files serially to avoid concurrent DB writes from different suites
    fileParallelism: false,
  },
});
