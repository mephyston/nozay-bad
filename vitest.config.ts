import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { cloudflareTest } from '@cloudflare/vitest-pool-workers';
import path from 'path';
import { wranglerTestConfigPath } from './vitest.wrangler';

// Config wrangler SANS binding AI (voir vitest.wrangler.ts) : évite la session proxy
// distante du pool → tests locaux, rapides, sans token ni charges AI.
const wranglerConfig = wranglerTestConfigPath();

export default defineConfig({
  resolve: {
    alias: {
      'astro:transitions/client': path.resolve(__dirname, './libs/shared/ui/src/mocks/astro-transitions.ts'),
      '@nba/db/test-utils': path.resolve(__dirname, './libs/shared/db/src/test-utils.ts'),
      '@nba/db': path.resolve(__dirname, './libs/shared/db/src/index.ts'),
      '@nba/pdf': path.resolve(__dirname, './libs/shared/pdf/src/index.ts'),
      '@nba/push': path.resolve(__dirname, './libs/shared/push/src/index.ts'),
      '@nba/ui': path.resolve(__dirname, './libs/shared/ui/src/index.ts'),
      '@nba/api-client': path.resolve(__dirname, './libs/shared/api-client/src/index.ts'),
      '@nba/members-api': path.resolve(__dirname, './libs/domains/members/index.ts'),
      '@nba/members/schema': path.resolve(__dirname, './libs/domains/members/shared/schema.ts'),
      '@nba/members-ui': path.resolve(__dirname, './libs/domains/members/shared/ui.ts'),
      '@nba/accounting-api': path.resolve(__dirname, './libs/domains/accounting/index.ts'),
      '@nba/accounting/schema': path.resolve(__dirname, './libs/domains/accounting/shared/schema.ts'),
      '@nba/accounting-ui': path.resolve(__dirname, './libs/domains/accounting/shared/ui.ts'),
      '@nba/notifications-api': path.resolve(__dirname, './libs/domains/notifications/index.ts'),
      '@nba/notifications/schema': path.resolve(__dirname, './libs/domains/notifications/shared/schema.ts'),
      '@nba/iam': path.resolve(__dirname, './libs/domains/iam/index.ts'),
      '@nba/iam/schema': path.resolve(__dirname, './libs/domains/iam/shared/schema.ts'),
      '@nba/iam-ui': path.resolve(__dirname, './libs/domains/iam/shared/ui.ts'),
      '@nba/expenses-api': path.resolve(__dirname, './libs/domains/expenses/index.ts'),
      '@nba/expenses/schema': path.resolve(__dirname, './libs/domains/expenses/shared/schema.ts'),
      '@nba/expenses-ui': path.resolve(__dirname, './libs/domains/expenses/shared/ui.ts'),
      '@nba/shop-api': path.resolve(__dirname, './libs/domains/shop/index.ts'),
      '@nba/shop/schema': path.resolve(__dirname, './libs/domains/shop/shared/schema.ts'),
      '@nba/shop-ui': path.resolve(__dirname, './libs/domains/shop/shared/ui.ts'),
      '@nba/notifications-ui': path.resolve(__dirname, './libs/domains/notifications/shared/ui.ts'),
    },

  },
  test: {
    // Vitest 4 : poolOptions supprimé, les options sont désormais au niveau racine.
    pool: 'threads',
    // Les 5 s par défaut sont trop justes en CI : `setupMockDb()` rejoue toutes les
    // migrations à chaque test (~140 allers-retours D1), ce qui coûte des secondes sur
    // un runner GitHub là où la même chose prend 30 ms en local. Les migrations RBAC
    // ont fait déborder les tests les plus lents. 20 s laissent de la marge sans rien
    // masquer : un test réellement bloqué ne finit jamais, il ne met pas 20 s.
    // Le vrai correctif est de ne plus rejouer les migrations à chaque test.
    testTimeout: 20000,
    hookTimeout: 20000,
    isolate: true,
    maxWorkers: '75%',
    fileParallelism: true,
    // Filet de sécurité pour `vitest --changed` (CI) : ces fichiers ne sont PAS dans le
    // graphe d'imports (migrations SQL, config wrangler du pool, configs racine). S'ils
    // changent, Vitest ignore --changed et relance TOUTE la suite.
    forceRerunTriggers: [
      '**/package.json',
      '**/{vitest,vite}.config.*',
      '**/vitest.setup.ts',
      '**/vitest.wrangler.ts',
      '**/wrangler.json',
      '**/db/migrations/**',
      '**/drizzle.config.ts',
    ],
    projects: [
      // Standard config files for apps and shared libs
      'apps/api/vitest.config.ts',
      'apps/admin/vitest.config.ts',
      'libs/shared/db/vitest.config.ts',
      'libs/shared/push/vitest.config.ts',
      'apps/storefront/vitest.config.ts',
      'libs/shared/ui/vitest.config.ts',
      
      // Inline project configs for members API and UI
      {
        extends: true,
        plugins: [
          cloudflareTest({
            wrangler: {
              configPath: wranglerConfig,
            },
          }),
        ],
        cacheDir: path.resolve(__dirname, 'node_modules/.vite/features-members-api'),
        test: {
          name: 'features-members-api',
          globals: true,
          root: path.resolve(__dirname, 'libs/domains/members'),
          include: ['**/*.test.ts'],
          exclude: ['**/ui/**', '**/node_modules/**'],
        }
      },
      {
        extends: true,
        plugins: [svelte()],
        cacheDir: path.resolve(__dirname, 'node_modules/.vite/features-members-ui'),
        resolve: {
          conditions: ['browser'],
        },
        test: {
          name: 'features-members-ui',
          globals: true,
          environment: 'jsdom',
          setupFiles: [path.resolve(__dirname, 'vitest.setup.ts')],
          root: path.resolve(__dirname, 'libs/domains/members'),
          include: ['get-member-by-licence/ui/**/*.test.ts', 'import-members-csv/ui/**/*.test.ts', 'list-members/ui/**/*.test.ts'],
        }
      },
      
      // Inline project configs for accounting API and UI
      {
        extends: true,
        plugins: [
          cloudflareTest({
            wrangler: {
              configPath: wranglerConfig,
            },
          }),
        ],
        cacheDir: path.resolve(__dirname, 'node_modules/.vite/features-accounting-api'),
        test: {
          name: 'features-accounting-api',
          globals: true,
          root: path.resolve(__dirname, 'libs/domains/accounting'),
          include: ['**/*.test.ts'],
          exclude: ['**/ui/**', '**/node_modules/**'],
        }
      },
      {
        extends: true,
        plugins: [svelte()],
        cacheDir: path.resolve(__dirname, 'node_modules/.vite/features-accounting-ui'),
        resolve: {
          conditions: ['browser'],
        },
        test: {
          name: 'features-accounting-ui',
          globals: true,
          environment: 'jsdom',
          setupFiles: [path.resolve(__dirname, 'vitest.setup.ts')],
          root: path.resolve(__dirname, 'libs/domains/accounting'),
          include: ['*/**/ui/**/*.test.ts'],
        }
      },
      
      // Inline project configs for expenses API and UI
      {
        extends: true,
        plugins: [
          cloudflareTest({
            wrangler: {
              configPath: wranglerConfig,
            },
          }),
        ],
        cacheDir: path.resolve(__dirname, 'node_modules/.vite/features-expenses-api'),
        test: {
          name: 'features-expenses-api',
          globals: true,
          root: path.resolve(__dirname, 'libs/domains/expenses'),
          include: ['**/*.test.ts'],
          exclude: ['**/ui/**', '**/node_modules/**'],
        }
      },
      {
        extends: true,
        plugins: [svelte()],
        cacheDir: path.resolve(__dirname, 'node_modules/.vite/features-expenses-ui'),
        resolve: {
          conditions: ['browser'],
        },
        test: {
          name: 'features-expenses-ui',
          globals: true,
          environment: 'jsdom',
          setupFiles: [path.resolve(__dirname, 'vitest.setup.ts')],
          root: path.resolve(__dirname, 'libs/domains/expenses'),
          include: ['create/ui/**/*.test.ts', 'list/ui/**/*.test.ts', 'update/ui/**/*.test.ts'],
        }
      },
      
      // Inline project configs for shop API and UI
      {
        extends: true,
        plugins: [
          cloudflareTest({
            wrangler: {
              configPath: wranglerConfig,
            },
          }),
        ],
        cacheDir: path.resolve(__dirname, 'node_modules/.vite/features-shop-api'),
        test: {
          name: 'features-shop-api',
          globals: true,
          root: path.resolve(__dirname, 'libs/domains/shop'),
          include: ['**/*.test.ts'],
          exclude: ['**/ui/**', '**/node_modules/**'],
        }
      },
      {
        extends: true,
        plugins: [svelte()],
        cacheDir: path.resolve(__dirname, 'node_modules/.vite/features-shop-ui'),
        resolve: {
          conditions: ['browser'],
        },
        test: {
          name: 'features-shop-ui',
          globals: true,
          environment: 'jsdom',
          setupFiles: [path.resolve(__dirname, 'vitest.setup.ts')],
          root: path.resolve(__dirname, 'libs/domains/shop'),
          include: ['list-orders/ui/**/*.test.ts', 'list-products/ui/**/*.test.ts'],
        }
      },
      // Inline project config for notifications API
      {
        extends: true,
        plugins: [
          cloudflareTest({
            wrangler: {
              configPath: wranglerConfig,
            },
          }),
        ],
        cacheDir: path.resolve(__dirname, 'node_modules/.vite/features-notifications-api'),
        test: {
          name: 'features-notifications-api',
          globals: true,
          root: path.resolve(__dirname, 'libs/domains/notifications'),
          include: ['**/*.test.ts'],
          exclude: ['**/ui/**', '**/node_modules/**'],
        }
      },

      // Inline project config for the IAM domain (RBAC kernel + slices)
      {
        extends: true,
        plugins: [
          cloudflareTest({
            wrangler: {
              configPath: wranglerConfig,
            },
          }),
        ],
        cacheDir: path.resolve(__dirname, 'node_modules/.vite/features-iam-api'),
        test: {
          name: 'features-iam-api',
          globals: true,
          root: path.resolve(__dirname, 'libs/domains/iam'),
          include: ['**/*.test.ts'],
          exclude: ['**/components/**', '**/node_modules/**'],
        }
      },

      // Architecture tests project
      {
        extends: true,
        test: {
          name: 'architecture-tests',
          globals: true,
          environment: 'node',
          include: ['libs/*.test.ts'],
        }
      },
    ],
  },
});
