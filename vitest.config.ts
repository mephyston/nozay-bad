import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      'apps/api/vitest.config.ts',
      'apps/admin/vitest.config.ts',
      'libs/shared/db/vitest.config.ts',
      'apps/storefront/vitest.config.ts',
      'libs/domains/members/vitest.config.api.ts',
      'libs/domains/accounting/vitest.config.api.ts',
      'libs/domains/expenses/vitest.config.api.ts',
      'libs/domains/shop/vitest.config.api.ts',
      'libs/shared/ui/vitest.config.ts',
      'libs/domains/members/vitest.config.ui.ts',
      'libs/domains/accounting/vitest.config.ui.ts',
      'libs/domains/expenses/vitest.config.ui.ts',
      'libs/domains/shop/vitest.config.ui.ts',
    ],
  },
});

