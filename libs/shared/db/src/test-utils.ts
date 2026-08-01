// @ts-ignore
import { env } from 'cloudflare:test';
import { drizzle } from 'drizzle-orm/d1';

export async function setupMockDb() {
  const rawDb = env.DB;

  // Topological sorting of tables (child tables dropped/deleted before parent tables to avoid foreign key errors)
  const tables = [
    'attestation_config',
    'expenses',
    'ledger_entries',
    'orders',
    'checks',
    'invoice_items',
    'invoices',
    'check_deposits',
    'bank_statement_lines',
    'orders',
    'products',
    'product_categories',
    'members',
    'season_balances',
    'season_category_budgets',
    'categories',
    'users',
    'seasons',
    'payment_methods',
    'accounts',
    'account_classes'
  ];



  // Disable foreign keys temporarily during drop to avoid constraint violations
  await rawDb.prepare('PRAGMA foreign_keys = OFF;').run();
  for (const table of tables) {
    try { await rawDb.prepare(`DELETE FROM "${table}";`).run(); } catch {}
  }
  for (const table of tables) {
    await rawDb.prepare(`DROP TABLE IF EXISTS "${table}";`).run();
  }
  await rawDb.prepare('PRAGMA foreign_keys = ON;').run();

  // Load migrations sequentially using Vite's static raw glob import (loaded at build time)
  const migrationFiles = import.meta.glob('../../db/migrations/*.sql', { query: '?raw', import: 'default', eager: true });
  const sortedFiles = Object.keys(migrationFiles).sort();

  for (const file of sortedFiles) {
    const sqlContent = migrationFiles[file] as string;
    let statements: string[];
    if (sqlContent.includes('--> statement-breakpoint')) {
      statements = sqlContent.split('--> statement-breakpoint');
    } else {
      statements = sqlContent.split(';');
    }
    for (const stmt of statements) {
      const trimmed = stmt.trim();
      if (trimmed.length > 0) {
        await rawDb.prepare(trimmed).run();
      }
    }
  }

  return { mockD1: rawDb, db: drizzle(rawDb) };
}
