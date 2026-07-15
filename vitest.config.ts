import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      'apps/api/vitest.config.ts',
      'apps/admin-console/vitest.config.ts',
      'libs/shared/db/vitest.config.ts',
      'apps/boutique/vitest.config.ts',
      'libs/features/members/api/vitest.config.ts',
      'libs/features/accounting/api/vitest.config.ts',
      'libs/features/expenses/api/vitest.config.ts',
      'libs/features/shop/api/vitest.config.ts',
    ],
  },
});

