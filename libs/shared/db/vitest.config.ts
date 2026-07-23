import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@nba/db': path.resolve(__dirname, './src/index.ts'),
    },
  },
  test: {
    globals: true,
  },
});
