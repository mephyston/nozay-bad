import { env } from 'cloudflare:test';
import { drizzle } from 'drizzle-orm/d1';

export async function setupMockDb() {
  const rawDb = env.DB;

  // Topological sorting of tables (child tables dropped/deleted before parent tables to avoid foreign key errors)
  const tables = [
    'checks',
    'ledger_entries',
    'invoice_items',
    'invoices',
    'check_deposits',
    'bank_statement_lines',
    'orders',
    'products',
    'members',
    'season_balances',
    'season_category_budgets',
    'categories',
    'expenses',
    'users',
    'seasons',
    'accounts',
    'account_classes',
    'payment_methods'
  ];



  // Transaction backups stack for rollback emulation
  const transactionStack: Record<string, any[]>[] = [];

  // Transparent JavaScript Proxy to intercept transaction SQL and forward everything else
  const dbProxy = new Proxy(rawDb, {
    get(target, prop, receiver) {
      if (prop === 'prepare') {
        return (query: string) => {
          const q = query.trim().toLowerCase();
          if (q === 'begin' || q === 'begin transaction') {
            const stmt = {
              bind: () => stmt,
              run: async () => {
                // Snapshot all tables
                const snapshot: Record<string, any[]> = {};
                for (const table of tables) {
                  try {
                    const res = await target.prepare(`SELECT * FROM "${table}"`).all();
                    snapshot[table] = res.results || [];
                  } catch (e) {
                    // Table might not exist yet
                  }
                }
                transactionStack.push(snapshot);
                return { success: true, meta: { changes: 0, duration: 0, rows_read: 0, rows_written: 0 } };
              },
              all: async () => ({ results: [], success: true, meta: { changes: 0, duration: 0, rows_read: 0, rows_written: 0 } }),
              first: async () => null,
              raw: async () => []
            };
            return stmt;
          }
          if (q === 'commit') {
            const stmt = {
              bind: () => stmt,
              run: async () => {
                // Discard the latest snapshot
                transactionStack.pop();
                return { success: true, meta: { changes: 0, duration: 0, rows_read: 0, rows_written: 0 } };
              },
              all: async () => ({ results: [], success: true, meta: { changes: 0, duration: 0, rows_read: 0, rows_written: 0 } }),
              first: async () => null,
              raw: async () => []
            };
            return stmt;
          }
          if (q === 'rollback') {
            const stmt = {
              bind: () => stmt,
              run: async () => {
                // Restore from the latest snapshot
                const snapshot = transactionStack.pop();
                if (snapshot) {
                  // Delete records from child tables to parent tables
                  for (const table of tables) {
                    try {
                      await target.prepare(`DELETE FROM "${table}"`).run();
                    } catch (e) {
                      // Table might not exist
                    }
                  }
                  // Restore records from parent tables to child tables (reverse order)
                  const reverseTables = [...tables].reverse();
                  for (const table of reverseTables) {
                    const rows = snapshot[table] || [];
                    for (const row of rows) {
                      try {
                        const keys = Object.keys(row).map(k => `"${k}"`).join(', ');
                        const placeholders = Object.keys(row).map(() => '?').join(', ');
                        const values = Object.values(row);
                        await target.prepare(`INSERT INTO "${table}" (${keys}) VALUES (${placeholders})`).bind(...values).run();
                      } catch (e) {
                        // Failed to restore row
                      }
                    }
                  }
                }
                return { success: true, meta: { changes: 0, duration: 0, rows_read: 0, rows_written: 0 } };
              },
              all: async () => ({ results: [], success: true, meta: { changes: 0, duration: 0, rows_read: 0, rows_written: 0 } }),
              first: async () => null,
              raw: async () => []
            };
            return stmt;
          }
          return target.prepare(query);
        };
      }
      if (prop === 'exec') {
        return (query: string) => {
          const q = query.trim().toLowerCase();
          if (q === 'begin' || q === 'begin transaction') {
            // Emulate begin
            return rawDb.prepare(q).run().then(() => ({ count: 0, duration: 0 }));
          }
          if (q === 'commit') {
            return Promise.resolve({ count: 0, duration: 0 });
          }
          if (q === 'rollback') {
            return Promise.resolve({ count: 0, duration: 0 });
          }
          return target.exec(query);
        };
      }
      return Reflect.get(target, prop, receiver);
    }
  });

  // Disable foreign keys temporarily during drop to avoid constraint violations
  await rawDb.prepare('PRAGMA foreign_keys = OFF;').run();
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

  return { mockD1: dbProxy, db: drizzle(dbProxy) };
}
