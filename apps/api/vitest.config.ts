import { defineConfig } from 'vitest/config';
import { cloudflareTest } from '@cloudflare/vitest-pool-workers';
import path from 'path';

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: {
        configPath: path.resolve(__dirname, './wrangler.json'),
      },
    }),
  ],
  resolve: {
    alias: {
      '@nba/db/test-utils': path.resolve(__dirname, '../../libs/shared/db/src/test-utils.ts'),
      '@nba/db': path.resolve(__dirname, '../../libs/shared/db/src/index.ts'),
      '@nba/members-api': path.resolve(__dirname, '../../libs/domains/members/index.ts'),
      '@nba/members/schema': path.resolve(__dirname, '../../libs/domains/members/shared/schema.ts'),
      '@nba/accounting-api': path.resolve(__dirname, '../../libs/domains/accounting/index.ts'),
      '@nba/accounting/schema': path.resolve(__dirname, '../../libs/domains/accounting/shared/schema.ts'),
      '@nba/expenses-api': path.resolve(__dirname, '../../libs/domains/expenses/index.ts'),
      '@nba/expenses/schema': path.resolve(__dirname, '../../libs/domains/expenses/shared/schema.ts'),
      '@nba/shop-api': path.resolve(__dirname, '../../libs/domains/shop/index.ts'),
      '@nba/shop/schema': path.resolve(__dirname, '../../libs/domains/shop/shared/schema.ts'),
    },
  },
  test: {
    globals: true,
  },
});
