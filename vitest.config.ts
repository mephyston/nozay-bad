import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@metacult/shared-db/test-utils': path.resolve(__dirname, './libs/shared/db/src/test-utils.ts'),
      '@metacult/shared-db': path.resolve(__dirname, './libs/shared/db/src/index.ts'),
      '@metacult/shared-ui': path.resolve(__dirname, './libs/shared/ui/src/index.ts'),
      '@metacult/features-members-api': path.resolve(__dirname, './libs/domains/members/index.ts'),
      '@metacult/features-members-ui': path.resolve(__dirname, './libs/domains/members/shared/ui.ts'),
      '@metacult/features-accounting-api': path.resolve(__dirname, './libs/domains/accounting/index.ts'),
      '@metacult/features-accounting-ui': path.resolve(__dirname, './libs/domains/accounting/shared/ui.ts'),
      '@metacult/features-expenses-api': path.resolve(__dirname, './libs/domains/expenses/index.ts'),
      '@metacult/features-expenses-ui': path.resolve(__dirname, './libs/domains/expenses/shared/ui.ts'),
      '@metacult/features-shop-api': path.resolve(__dirname, './libs/domains/shop/index.ts'),
      '@metacult/features-shop-ui': path.resolve(__dirname, './libs/domains/shop/shared/ui.ts'),
    },
  },
  test: {
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
        cacheDir: path.resolve(__dirname, 'node_modules/.vite/features-members-api'),
        test: {
          name: 'features-members-api',
          globals: true,
          environment: 'miniflare',
          environmentOptions: {
            d1Databases: ['DB'],
          },
          root: path.resolve(__dirname, 'libs/domains/members'),
          include: ['commands/**/*.test.ts', 'queries/**/*.test.ts', 'shared/**/*.test.ts'],
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
        cacheDir: path.resolve(__dirname, 'node_modules/.vite/features-accounting-api'),
        test: {
          name: 'features-accounting-api',
          globals: true,
          environment: 'miniflare',
          environmentOptions: {
            d1Databases: ['DB'],
          },
          root: path.resolve(__dirname, 'libs/domains/accounting'),
          include: ['commands/**/*.test.ts', 'queries/**/*.test.ts'],
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
          include: ['commands/**/ui/**/*.test.ts', 'queries/**/ui/**/*.test.ts'],
        }
      },
      
      // Inline project configs for expenses API and UI
      {
        extends: true,
        cacheDir: path.resolve(__dirname, 'node_modules/.vite/features-expenses-api'),
        test: {
          name: 'features-expenses-api',
          globals: true,
          environment: 'miniflare',
          environmentOptions: {
            d1Databases: ['DB'],
          },
          root: path.resolve(__dirname, 'libs/domains/expenses'),
          include: ['commands/**/*.test.ts', 'queries/**/*.test.ts', 'shared/**/*.test.ts'],
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
        cacheDir: path.resolve(__dirname, 'node_modules/.vite/features-shop-api'),
        test: {
          name: 'features-shop-api',
          globals: true,
          environment: 'miniflare',
          environmentOptions: {
            d1Databases: ['DB'],
          },
          root: path.resolve(__dirname, 'libs/domains/shop'),
          include: ['commands/**/*.test.ts', 'queries/**/*.test.ts', 'shared/**/*.test.ts'],
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
      {
        extends: true,
        test: {
          name: 'architecture-tests',
          globals: true,
          environment: 'node',
          include: ['libs/architecture.test.ts'],
        }
      },
    ],
  },
});
