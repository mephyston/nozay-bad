import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@metacult/features-members-data-access': path.resolve(__dirname, '../../libs/domains/members/data-access/src/index.ts'),
      '@metacult/features-accounting-data-access': path.resolve(__dirname, '../../libs/domains/accounting/data-access/src/index.ts'),
      '@metacult/features-expenses-data-access': path.resolve(__dirname, '../../libs/domains/expenses/data-access/src/index.ts'),
      '@metacult/features-shop-data-access': path.resolve(__dirname, '../../libs/domains/shop/data-access/src/index.ts'),
      '@metacult/shared-db/test-utils': path.resolve(__dirname, '../../libs/shared/db/src/test-utils.ts'),
      '@metacult/shared-db': path.resolve(__dirname, '../../libs/shared/db/src/index.ts'),
      '@metacult/features-members-api': path.resolve(__dirname, '../../libs/domains/members/api/src/index.ts'),
      '@metacult/features-accounting-api': path.resolve(__dirname, '../../libs/domains/accounting/api/src/index.ts'),
      '@metacult/features-expenses-api': path.resolve(__dirname, '../../libs/domains/expenses/api/src/index.ts'),
      '@metacult/features-shop-api': path.resolve(__dirname, '../../libs/domains/shop/api/src/index.ts'),
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
