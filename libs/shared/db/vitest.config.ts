import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@metacult/shared-db': path.resolve(__dirname, './src/index.ts'),
    },
  },
  test: {
    globals: true,
  },
});
