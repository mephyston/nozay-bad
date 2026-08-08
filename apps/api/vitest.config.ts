import { defineConfig } from 'vitest/config';
import { cloudflareTest } from '@cloudflare/vitest-pool-workers';
import path from 'path';
import { wranglerTestConfigPath } from '../../vitest.wrangler';

// Config wrangler sans binding AI (voir vitest.wrangler.ts) : pool local, pas de proxy distant.
const wranglerConfig = wranglerTestConfigPath();

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: {
        configPath: wranglerConfig,
      },
    }),
  ],
  resolve: {
    alias: {
      '@nba/db/test-utils': path.resolve(__dirname, '../../libs/shared/db/src/test-utils.ts'),
      '@nba/db': path.resolve(__dirname, '../../libs/shared/db/src/index.ts'),
      '@nba/pdf': path.resolve(__dirname, '../../libs/shared/pdf/src/index.ts'),
      '@nba/push': path.resolve(__dirname, '../../libs/shared/push/src/index.ts'),
      '@nba/notifications-api': path.resolve(__dirname, '../../libs/domains/notifications/index.ts'),
      '@nba/notifications/schema': path.resolve(__dirname, '../../libs/domains/notifications/shared/schema.ts'),
      '@nba/announcements-api': path.resolve(__dirname, '../../libs/domains/announcements/index.ts'),
      '@nba/announcements/schema': path.resolve(__dirname, '../../libs/domains/announcements/shared/schema.ts'),
      '@nba/members-api': path.resolve(__dirname, '../../libs/domains/members/index.ts'),
      '@nba/members/schema': path.resolve(__dirname, '../../libs/domains/members/shared/schema.ts'),
      '@nba/iam': path.resolve(__dirname, '../../libs/domains/iam/index.ts'),
      '@nba/iam/schema': path.resolve(__dirname, '../../libs/domains/iam/shared/schema.ts'),
      '@nba/accounting-api': path.resolve(__dirname, '../../libs/domains/accounting/index.ts'),
      '@nba/accounting/schema': path.resolve(__dirname, '../../libs/domains/accounting/shared/schema.ts'),
      '@nba/expenses-api': path.resolve(__dirname, '../../libs/domains/expenses/index.ts'),
      '@nba/expenses/schema': path.resolve(__dirname, '../../libs/domains/expenses/shared/schema.ts'),
      '@nba/shop-api': path.resolve(__dirname, '../../libs/domains/shop/index.ts'),
      '@nba/shop/schema': path.resolve(__dirname, '../../libs/domains/shop/shared/schema.ts'),
    },
  },
  test: {
    name: 'api',
    globals: true,
  },
});
