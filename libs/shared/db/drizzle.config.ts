import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'sqlite',
  schema: './libs/domains/*/data-access/src/schema.ts',
  out: './libs/shared/db/migrations',
});
