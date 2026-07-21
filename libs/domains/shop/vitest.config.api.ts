import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@metacult/shared-db/test-utils': path.resolve(__dirname, '../../shared/db/src/test-utils.ts'),
      '@metacult/shared-db': path.resolve(__dirname, '../../shared/db/src/index.ts'),
      '@metacult/features-members-api': path.resolve(__dirname, '../members/index.ts'),
      '@metacult/features-accounting-api': path.resolve(__dirname, '../accounting/index.ts'),
      '@metacult/features-expenses-api': path.resolve(__dirname, '../expenses/index.ts'),
      '@metacult/features-shop-api': path.resolve(__dirname, './index.ts'),
    },
  },
  test: {
    name: 'features-shop-api',
    globals: true,
    environment: 'miniflare',
    environmentOptions: {
      d1Databases: ['DB'],
    },
    root: __dirname,
    include: ['routes.test.ts', 'commands/**/*.test.ts', 'queries/**/*.test.ts', 'shared/**/*.test.ts'],
    exclude: ['**/ui/**', '**/node_modules/**'],
  },
});
