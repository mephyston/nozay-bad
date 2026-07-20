import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@metacult/features-members-data-access': path.resolve(__dirname, '../data-access/src/index.ts'),
      '@metacult/features-accounting-data-access': path.resolve(__dirname, '../../accounting/data-access/src/index.ts'),
      '@metacult/features-expenses-data-access': path.resolve(__dirname, '../../expenses/data-access/src/index.ts'),
      '@metacult/features-shop-data-access': path.resolve(__dirname, '../../shop/data-access/src/index.ts'),
      '@metacult/shared-db/test-utils': path.resolve(__dirname, '../../../shared/db/src/test-utils.ts'),
      '@metacult/shared-db': path.resolve(__dirname, '../../../shared/db/src/index.ts'),
      '@metacult/features-members-api': path.resolve(__dirname, './src/index.ts'),
      '@metacult/features-accounting-api': path.resolve(__dirname, '../../accounting/api/src/index.ts'),
      '@metacult/features-expenses-api': path.resolve(__dirname, '../../expenses/api/src/index.ts'),
      '@metacult/features-shop-api': path.resolve(__dirname, '../../shop/api/src/index.ts'),
    },
  },
  test: {
    name: 'features-members-api',
    globals: true,
    environment: 'miniflare',
    environmentOptions: {
      d1Databases: ['DB'],
    },
    root: __dirname,
    include: ['src/**/*.test.ts', '../**/*.test.ts'],
    exclude: ['../**/ui/**', '../data-access/**', '**/node_modules/**'],
  },
});
