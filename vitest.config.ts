import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      'apps/api/vitest.config.ts',
      'apps/admin-console/vitest.config.ts',
      'libs/shared/db/vitest.config.ts',
      'apps/boutique/vitest.config.ts',
    ],
  },
});

