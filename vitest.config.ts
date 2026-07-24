import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { cloudflareTest } from '@cloudflare/vitest-pool-workers';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@nba/db/test-utils': path.resolve(__dirname, './libs/shared/db/src/test-utils.ts'),
      '@nba/db': path.resolve(__dirname, './libs/shared/db/src/index.ts'),
      '@nba/ui': path.resolve(__dirname, './libs/shared/ui/src/index.ts'),
      '@nba/api-client': path.resolve(__dirname, './libs/shared/api-client/src/index.ts'),
      '@nba/members-api': path.resolve(__dirname, './libs/domains/members/index.ts'),
      '@nba/members/schema': path.resolve(__dirname, './libs/domains/members/shared/schema.ts'),
      '@nba/members-ui': path.resolve(__dirname, './libs/domains/members/shared/ui.ts'),
      '@nba/accounting-api': path.resolve(__dirname, './libs/domains/accounting/index.ts'),
      '@nba/accounting/schema': path.resolve(__dirname, './libs/domains/accounting/shared/schema.ts'),
      '@nba/accounting-ui': path.resolve(__dirname, './libs/domains/accounting/shared/ui.ts'),
      '@nba/expenses-api': path.resolve(__dirname, './libs/domains/expenses/index.ts'),
      '@nba/expenses/schema': path.resolve(__dirname, './libs/domains/expenses/shared/schema.ts'),
      '@nba/expenses-ui': path.resolve(__dirname, './libs/domains/expenses/shared/ui.ts'),
      '@nba/shop-api': path.resolve(__dirname, './libs/domains/shop/index.ts'),
      '@nba/shop/schema': path.resolve(__dirname, './libs/domains/shop/shared/schema.ts'),
      '@nba/shop-ui': path.resolve(__dirname, './libs/domains/shop/shared/ui.ts'),
    },

  },
  test: {
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        isolate: true,
      },
    },
    maxWorkers: '75%',
    fileParallelism: true,
    projects: [
      // Standard config files for apps and shared libs
      'apps/api/vitest.config.ts',
      'apps/admin/vitest.config.ts',
      'libs/shared/db/vitest.config.ts',
      'apps/storefront/vitest.config.ts',
      'libs/shared/ui/vitest.config.ts',
      
      // Inline project configs for members API and UI
      {
        extends: true,
        plugins: [
          cloudflareTest({
            wrangler: {
              configPath: path.resolve(__dirname, 'apps/api/wrangler.json'),
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
              configPath: path.resolve(__dirname, 'apps/api/wrangler.json'),
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
              configPath: path.resolve(__dirname, 'apps/api/wrangler.json'),
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
              configPath: path.resolve(__dirname, 'apps/api/wrangler.json'),
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
          root: path.resolve(__dirname, 'libs/domains/shop'),
          include: ['list-orders/ui/**/*.test.ts', 'list-products/ui/**/*.test.ts'],
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
