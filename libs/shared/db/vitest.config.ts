import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@metacult/features-members-data-access': path.resolve(__dirname, '../../features/members/data-access/src/index.ts'),
      '@metacult/features-accounting-data-access': path.resolve(__dirname, '../../features/accounting/data-access/src/index.ts'),
      '@metacult/features-expenses-data-access': path.resolve(__dirname, '../../features/expenses/data-access/src/index.ts'),
      '@metacult/features-shop-data-access': path.resolve(__dirname, '../../features/shop/data-access/src/index.ts'),
      '@metacult/shared-db': path.resolve(__dirname, './src/index.ts'),
    },
  },
  test: {
    globals: true,
  },
});
