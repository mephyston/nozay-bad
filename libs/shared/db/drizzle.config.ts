import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'sqlite',
  schema: './libs/domains/*/shared/schema.ts',
  out: './libs/shared/db/migrations',
});
