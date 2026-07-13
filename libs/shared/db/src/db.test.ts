import { describe, it, expect } from 'vitest';
import { membersTable, usersTable, seasonBalancesTable, transactionsTable, seasonsTable, bankTransactionsTable } from './schema';
import { drizzle } from 'drizzle-orm/d1';
import { DatabaseSync } from 'node:sqlite';
import * as fs from 'node:fs';
import * as path from 'node:path';

class MockD1Database {
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

class MockD1PreparedStatement {
  private stmt: any;
  private params: any[] = [];

  constructor(stmt: any) {
    this.stmt = stmt;
  }

  bind(...values: any[]) {
    const newStmt = new MockD1PreparedStatement(this.stmt);
    newStmt.params = values.map(v => {
      if (v instanceof Date) return v.getTime();
      if (typeof v === 'boolean') return v ? 1 : 0;
      return v;
    });
    return newStmt;
  }

  async all() {
    const results = this.stmt.all(...this.params);
    return { results };
  }

  async run() {
    const runResult = this.stmt.run(...this.params);
    return {
      success: true,
      meta: {
        changes: runResult.changes,
        last_row_id: runResult.lastInsertRowid,
      }
    };
  }

  async first(colName?: string) {
    const results = this.stmt.all(...this.params);
    if (results.length === 0) return null;
    const row = results[0];
    if (colName) return row[colName];
    return row;
  }

  async raw() {
    const results = this.stmt.all(...this.params);
    return results.map((row: any) => Object.values(row));
  }
}

describe('Database Tests', () => {
  it('should run migrations and insert/retrieve a member and a user', async () => {
    const mockD1 = new MockD1Database();
    
    // Apply migrations
    const migrationsDir = path.resolve(__dirname, '../migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of migrationFiles) {
      const sqlPath = path.join(migrationsDir, file);
      const sqlContent = fs.readFileSync(sqlPath, 'utf8');
      const statements = sqlContent.split('--> statement-breakpoint');
      for (const statement of statements) {
        if (statement.trim()) {
          await mockD1.exec(statement);
        }
      }
    }

    // Initialize drizzle
    const db = drizzle(mockD1 as any);

    // Insert and verify a user
    const newUser = {
      email: 'admin@nozay-bad.fr',
      name: 'Admin',
      role: 'admin' as const,
      createdAt: new Date('2026-07-07T12:00:00Z'),
    };
    const userInsertResult = await db.insert(usersTable).values(newUser).run();
    expect(userInsertResult.success).toBe(true);

    const users = await db.select().from(usersTable).all();
    expect(users).toHaveLength(1);
    expect(users[0].email).toBe('admin@nozay-bad.fr');
    expect(users[0].name).toBe('Admin');
    expect(users[0].role).toBe('admin');

    // Insert a member
    const newMember = {
      licence: '1234567',
      season: '25-26',
      lastName: 'Dupont',
      firstName: 'Jean',
      gender: 'M' as const,
      birthDate: '1990-01-01',
      email: 'jean.dupont@example.com',
      phone: '0612345678',
      status: 'valide',
      type: 'Competiteur',
      importedAt: new Date('2026-07-07T12:00:00Z'),
    };

    const insertResult = await db.insert(membersTable).values(newMember).run();
    expect(insertResult.success).toBe(true);

    // Retrieve the member
    const members = await db.select().from(membersTable).all();
    expect(members).toHaveLength(1);
    expect(members[0].licence).toBe('1234567');
    expect(members[0].season).toBe('25-26');
    expect(members[0].lastName).toBe('Dupont');
    expect(members[0].firstName).toBe('Jean');
    expect(members[0].gender).toBe('M');
    expect(members[0].birthDate).toBe('1990-01-01');
    expect(members[0].email).toBe('jean.dupont@example.com');
    expect(members[0].phone).toBe('0612345678');
    expect(members[0].status).toBe('valide');
    expect(members[0].type).toBe('Competiteur');
    expect(members[0].importedAt).toBeInstanceOf(Date);
    expect(members[0].importedAt.getTime()).toBe(new Date('2026-07-07T12:00:00Z').getTime());
  });

  it('should insert season balances and transactions correctly', async () => {
    const mockD1 = new MockD1Database();
    
    // Apply migrations
    const migrationsDir = path.resolve(__dirname, '../migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of migrationFiles) {
      const sqlPath = path.join(migrationsDir, file);
      const sqlContent = fs.readFileSync(sqlPath, 'utf8');
      const statements = sqlContent.split('--> statement-breakpoint');
      for (const statement of statements) {
        if (statement.trim()) {
          await mockD1.exec(statement);
        }
      }
    }

    const db = drizzle(mockD1 as any);

    // Insérer un solde initial
    const balance = {
      seasonId: '25-26',
      accountId: 'current' as const,
      initialBalance: 150000, // 1500,00 €
      createdAt: new Date()
    };
    const [insertedBalance] = await db.insert(seasonBalancesTable).values(balance).returning();
    expect(insertedBalance.initialBalance).toBe(150000);

    // Insérer une transaction
    const transaction = {
      seasonId: '25-26',
      type: 'recette' as const,
      accountId: 'current' as const,
      category: 'adhesions',
      amount: 4500, // 45,00 €
      date: '2026-07-13',
      paymentMethod: 'virement' as const,
      description: 'Adhésion Dupont Jean',
      createdAt: new Date()
    };
    const [insertedTx] = await db.insert(transactionsTable).values(transaction).returning();
    expect(insertedTx.amount).toBe(4500);
    expect(insertedTx.category).toBe('adhesions');
  });

  it('should insert bank transactions correctly', async () => {
    const mockD1 = new MockD1Database();
    
    // Apply migrations
    const migrationsDir = path.resolve(__dirname, '../migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of migrationFiles) {
      const sqlPath = path.join(migrationsDir, file);
      const sqlContent = fs.readFileSync(sqlPath, 'utf8');
      const statements = sqlContent.split('--> statement-breakpoint');
      for (const statement of statements) {
        if (statement.trim()) {
          await mockD1.exec(statement);
        }
      }
    }

    const db = drizzle(mockD1 as any);

    const op = {
      fitid: 'SG-123456-COURANT',
      seasonId: '25-26',
      accountId: 'current' as const,
      amount: -1560, // -15,60 €
      date: '2026-07-13',
      name: 'IONOS',
      memo: 'Facture Site Web',
      createdAt: new Date()
    };
    const [inserted] = await db.insert(bankTransactionsTable).values(op).returning();
    expect(inserted.fitid).toBe('SG-123456-COURANT');
    expect(inserted.amount).toBe(-1560);
    expect(inserted.status).toBe('pending');
  });
});

