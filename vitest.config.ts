import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      'apps/api/vitest.config.ts',
      'apps/admin-console/vitest.config.ts',
      'libs/shared/db/vitest.config.ts',
      'apps/boutique/vitest.config.ts',
      'libs/domains/members/api/vitest.config.ts',
      'libs/domains/accounting/api/vitest.config.ts',
      'libs/domains/expenses/api/vitest.config.ts',
      'libs/domains/shop/api/vitest.config.ts',
      'libs/shared/ui/vitest.config.ts',
      'libs/domains/members/ui/vitest.config.ts',
      'libs/domains/accounting/ui/vitest.config.ts',
      'libs/domains/expenses/ui/vitest.config.ts',
      'libs/domains/shop/ui/vitest.config.ts',
    ],
  },
});

