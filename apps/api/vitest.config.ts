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
      '@nba/html': path.resolve(__dirname, '../../libs/shared/html/src/index.ts'),
      '@nba/notifications-api': path.resolve(__dirname, '../../libs/domains/notifications/index.ts'),
      '@nba/notifications/schema': path.resolve(__dirname, '../../libs/domains/notifications/shared/schema.ts'),
      '@nba/cms-api': path.resolve(__dirname, '../../libs/domains/cms/index.ts'),
      '@nba/cms/schema': path.resolve(__dirname, '../../libs/domains/cms/shared/schema.ts'),
      '@nba/schedules-api': path.resolve(__dirname, '../../libs/domains/schedules/index.ts'),
      '@nba/schedules/schema': path.resolve(__dirname, '../../libs/domains/schedules/shared/schema.ts'),
      '@nba/events-api': path.resolve(__dirname, '../../libs/domains/events/index.ts'),
      '@nba/teams-api': path.resolve(__dirname, '../../libs/domains/teams/index.ts'),
      '@nba/teams/schema': path.resolve(__dirname, '../../libs/domains/teams/shared/schema.ts'),
      '@nba/members-api': path.resolve(__dirname, '../../libs/domains/members/index.ts'),
      '@nba/members/schema': path.resolve(__dirname, '../../libs/domains/members/shared/schema.ts'),
      '@nba/members/test-fixtures': path.resolve(__dirname, '../../libs/domains/members/shared/test-fixtures.ts'),
      '@nba/iam': path.resolve(__dirname, '../../libs/domains/iam/index.ts'),
      '@nba/iam/schema': path.resolve(__dirname, '../../libs/domains/iam/shared/schema.ts'),
      '@nba/accounting-api': path.resolve(__dirname, '../../libs/domains/accounting/index.ts'),
      '@nba/accounting/schema': path.resolve(__dirname, '../../libs/domains/accounting/shared/schema.ts'),
      '@nba/expenses-api': path.resolve(__dirname, '../../libs/domains/expenses/index.ts'),
      '@nba/expenses/schema': path.resolve(__dirname, '../../libs/domains/expenses/shared/schema.ts'),
      '@nba/shop-api': path.resolve(__dirname, '../../libs/domains/shop/index.ts'),
      '@nba/shop/schema': path.resolve(__dirname, '../../libs/domains/shop/shared/schema.ts'),
      '@nba/club/settings': path.resolve(__dirname, '../../libs/domains/club/shared/settings-api.ts'),
      '@nba/club/schema': path.resolve(__dirname, '../../libs/domains/club/shared/schema.ts'),
      '@nba/club': path.resolve(__dirname, '../../libs/domains/club/index.ts'),
    },
  },
  test: {
    name: 'api',
    globals: true,
    // Projet à fichier séparé : il n'hérite PAS du `setupFiles` de la config racine.
    // Sans cette ligne, l'horloge n'est pas figée ici (voir vitest.setup.clock.ts).
    setupFiles: [path.resolve(__dirname, '../..', 'vitest.setup.clock.ts')],
    // Projet à fichier séparé : il n'hérite PAS du `testTimeout` de la config racine.
    // Sans ces valeurs, le projet tournait aux 5 s par défaut — et c'est précisément
    // lui qui fait le plus de setupMockDb : sur un runner GitHub saturé, des tests
    // sains dépassaient la limite et la CI échouait en timeout (run du 17/08).
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});
