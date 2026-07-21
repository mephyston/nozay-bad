import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@metacult/shared-db/test-utils': path.resolve(__dirname, '../../libs/shared/db/src/test-utils.ts'),
      '@metacult/shared-db': path.resolve(__dirname, '../../libs/shared/db/src/index.ts'),
      '@metacult/features-members-api': path.resolve(__dirname, '../../libs/domains/members/index.ts'),
      '@metacult/features-accounting-api': path.resolve(__dirname, '../../libs/domains/accounting/index.ts'),
      '@metacult/features-expenses-api': path.resolve(__dirname, '../../libs/domains/expenses/index.ts'),
      '@metacult/features-shop-api': path.resolve(__dirname, '../../libs/domains/shop/index.ts'),
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
