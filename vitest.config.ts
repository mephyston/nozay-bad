import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      'apps/api/vitest.config.ts',
      'apps/admin/vitest.config.ts',
      'libs/shared/db/vitest.config.ts',
      'apps/storefront/vitest.config.ts',
      'libs/domains/members/api/vitest.config.ts',
      'libs/domains/accounting/api/vitest.config.ts',
      'libs/domains/expenses/api/vitest.config.ts',
      'libs/domains/shop/api/vitest.config.ts',
      'libs/shared/ui/vitest.config.ts',
      'libs/domains/members/vitest.config.ui.ts',
      'libs/domains/accounting/vitest.config.ui.ts',
      'libs/domains/expenses/vitest.config.ui.ts',
      'libs/domains/shop/vitest.config.ui.ts',
    ],
  },
});

