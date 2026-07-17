import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@metacult/features-members-data-access': path.resolve(__dirname, '../../libs/features/members/data-access/src/index.ts'),
      '@metacult/features-accounting-data-access': path.resolve(__dirname, '../../libs/features/accounting/data-access/src/index.ts'),
      '@metacult/features-expenses-data-access': path.resolve(__dirname, '../../libs/features/expenses/data-access/src/index.ts'),
      '@metacult/features-shop-data-access': path.resolve(__dirname, '../../libs/features/shop/data-access/src/index.ts'),
      '@metacult/shared-db/test-utils': path.resolve(__dirname, '../../libs/shared/db/src/test-utils.ts'),
      '@metacult/shared-db': path.resolve(__dirname, '../../libs/shared/db/src/index.ts'),
      '@metacult/features-members-api': path.resolve(__dirname, '../../libs/features/members/api/src/index.ts'),
      '@metacult/features-accounting-api': path.resolve(__dirname, '../../libs/features/accounting/api/src/index.ts'),
      '@metacult/features-expenses-api': path.resolve(__dirname, '../../libs/features/expenses/api/src/index.ts'),
      '@metacult/features-shop-api': path.resolve(__dirname, '../../libs/features/shop/api/src/index.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'miniflare',
    environmentOptions: {
      d1Databases: ['DB'],
    },
  },
});
