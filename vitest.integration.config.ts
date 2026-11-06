import path from 'node:path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    fileParallelism: false,
    testTimeout: 30000,
  },
  resolve: {
    alias: [
      { find: '@/locales', replacement: path.resolve(__dirname, './locales') },
      { find: '@', replacement: path.resolve(__dirname, './src') },
    ],
  },
});
