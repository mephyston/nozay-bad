import { DatabaseSync } from 'node:sqlite';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { drizzle } from 'drizzle-orm/d1';

export class MockD1Database {
  private db: DatabaseSync;

  constructor() {
    this.db = new DatabaseSync(':memory:');
  }

  async exec(query: string) {
    this.db.exec(query);
    return { count: 0, duration: 0 };
  }

  prepare(query: string) {
    const stmt = this.db.prepare(query);
    return new MockD1PreparedStatement(stmt);
  }

  async batch(statements: MockD1PreparedStatement[]) {
    const results = [];
    for (const stmt of statements) {
      results.push(await stmt.all());
    }
    return results;
  }
}

export class MockD1PreparedStatement {
  private stmt: any;
  private params: any[] = [];

  constructor(stmt: any) {
    this.stmt = stmt;
  }

  bind(...params: any[]) {
    const newStmt = new MockD1PreparedStatement(this.stmt);
    newStmt.params = params.map(p => {
      if (p instanceof Date) return p.getTime();
      if (typeof p === 'boolean') return p ? 1 : 0;
      return p;
    });
    return newStmt;
  }

  async first(key?: string) {
    const results = this.stmt.all(...this.params);
    if (results.length === 0) return null;
    const row = results[0];
    if (key) return row[key];
    return row;
  }

  async all() {
    const results = this.stmt.all(...this.params);
    return {
      results,
      success: true,
      meta: { duration: 0, rows_read: results.length, rows_written: 0 }
    };
  }

  async run() {
    const runResult = this.stmt.run(...this.params);
    return {
      success: true,
      meta: {
        changes: runResult.changes,
        last_row_id: runResult.lastInsertRowid,
        duration: 0,
        rows_read: 0,
        rows_written: 1
      }
    };
  }

  async raw() {
    const results = this.stmt.all(...this.params);
    return results.map((row: any) => Object.values(row));
  }
}

export async function setupMockDb() {
  const mockD1 = new MockD1Database();
  const db = drizzle(mockD1 as any);

  // Load migrations sequentially
  const migrationsDir = path.join(process.cwd(), 'libs/shared/db/migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const sqlContent = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    let statements: string[];
    if (sqlContent.includes('--> statement-breakpoint')) {
      statements = sqlContent.split('--> statement-breakpoint');
    } else {
      statements = sqlContent.split(';');
    }
    for (const stmt of statements) {
      const trimmed = stmt.trim();
      if (trimmed.length > 0) {
        await mockD1.exec(trimmed);
      }
    }
  }

  return { mockD1, db };
}
