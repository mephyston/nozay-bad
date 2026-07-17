import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@metacult/features-members-data-access': path.resolve(__dirname, '../../members/data-access/src/index.ts'),
      '@metacult/features-accounting-data-access': path.resolve(__dirname, '../../accounting/data-access/src/index.ts'),
      '@metacult/features-expenses-data-access': path.resolve(__dirname, '../data-access/src/index.ts'),
      '@metacult/features-shop-data-access': path.resolve(__dirname, '../../shop/data-access/src/index.ts'),
      '@metacult/shared-db/test-utils': path.resolve(__dirname, '../../../shared/db/src/test-utils.ts'),
      '@metacult/shared-db': path.resolve(__dirname, '../../../shared/db/src/index.ts'),
      '@metacult/features-members-api': path.resolve(__dirname, '../../members/api/src/index.ts'),
      '@metacult/features-accounting-api': path.resolve(__dirname, '../../accounting/api/src/index.ts'),
      '@metacult/features-expenses-api': path.resolve(__dirname, './src/index.ts'),
      '@metacult/features-shop-api': path.resolve(__dirname, '../../shop/api/src/index.ts'),
    },
  },
  test: {
    name: 'features-expenses-api',
    globals: true,
    environment: 'miniflare',
    environmentOptions: {
      d1Databases: ['DB'],
    },
  },
});
