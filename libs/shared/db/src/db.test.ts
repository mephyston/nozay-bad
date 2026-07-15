import { describe, it, expect } from 'vitest';
import { membersTable, usersTable, seasonBalancesTable, transactionsTable, seasonsTable, bankTransactionsTable, checkDepositsTable, checksTable, productsTable, ordersTable, categoriesTable, invoicesTable, invoiceItemsTable, accountClassesTable } from './index';
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
      category: 1,
      amount: 4500, // 45,00 €
      date: '2026-07-13',
      paymentMethod: 'virement' as const,
      description: 'Adhésion Dupont Jean',
      createdAt: new Date()
    };
    const [insertedTx] = await db.insert(transactionsTable).values(transaction).returning();
    expect(insertedTx.amount).toBe(4500);
    expect(insertedTx.category).toBe(1);
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

  it('should support new member payment and transaction relation fields', async () => {
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

    const [member] = await db.insert(membersTable).values({
      licence: '7778889',
      season: '25-26',
      lastName: 'Dupont',
      firstName: 'Jean',
      gender: 'M',
      birthDate: '2015-06-12',
      amountDue: 25000,
      amountReceived: 10000,
      amountRemaining: 15000,
      paid: false,
      parent1Name: 'Dupont Marc',
      type: 'Competiteur',
      importedAt: new Date()
    }).returning();

    expect(member.amountDue).toBe(25000);
    expect(member.parent1Name).toBe('Dupont Marc');

    const [bt] = await db.insert(bankTransactionsTable).values({
      fitid: 'FITID-RECONCILE-TEST',
      seasonId: '25-26',
      accountId: 'current',
      amount: 10000,
      date: '2026-07-13',
      name: 'Virement Dupont',
      status: 'reconciled',
      createdAt: new Date()
    }).returning();

    const [tx] = await db.insert(transactionsTable).values({
      seasonId: '25-26',
      type: 'recette',
      accountId: 'current',
      category: 1,
      amount: 10000,
      date: '2026-07-13',
      paymentMethod: 'virement',
      description: 'Acompte Dupont Jean',
      memberId: member.id,
      bankTransactionId: bt.id,
      createdAt: new Date()
    }).returning();

    expect(tx.memberId).toBe(member.id);
    expect(tx.bankTransactionId).toBe(bt.id);
  });

  it('should support check deposits and checks insertion and linking', async () => {
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

    // Insérer un dépôt de chèque
    const [deposit] = await db.insert(checkDepositsTable).values({
      seasonId: '25-26',
      reference: 'REMISE-20260713-1',
      date: '2026-07-13',
      amount: 45000, // 450.00 €
      status: 'pending',
      createdAt: new Date()
    }).returning();

    expect(deposit.reference).toBe('REMISE-20260713-1');

    // Insérer des chèques liés à cette remise
    const [c1] = await db.insert(checksTable).values({
      checkDepositId: deposit.id,
      seasonId: '25-26',
      number: '1234567',
      amount: 25000,
      emitter: 'Dupont Marc',
      bank: 'Société Générale',
      status: 'deposited',
      createdAt: new Date()
    }).returning();

    const [c2] = await db.insert(checksTable).values({
      checkDepositId: deposit.id,
      seasonId: '25-26',
      number: '7654321',
      amount: 20000,
      emitter: 'Durand Julie',
      bank: 'Crédit Agricole',
      status: 'deposited',
      createdAt: new Date()
    }).returning();

    expect(c1.checkDepositId).toBe(deposit.id);
    expect(c1.number).toBe('1234567');
    expect(c2.amount).toBe(20000);

    const checks = await db.select().from(checksTable).all();
    expect(checks).toHaveLength(2);
  });

  it('should insert and query products and orders', async () => {
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
    const getDb = () => db;

    const product = await db.insert(productsTable).values({
      name: 'RSL Grade 1',
      category: 'shuttlecock',
      price: 1500,
      stock: 10,
      active: true,
      createdAt: new Date()
    }).returning().get();

    expect(product.id).toBeDefined();
    expect(product.name).toBe('RSL Grade 1');

    // Insert dependency tables for order referencing
    const [member] = await db.insert(membersTable).values({
      licence: '1122334',
      season: '25-26',
      lastName: 'Martin',
      firstName: 'Sophie',
      gender: 'F',
      birthDate: '1995-04-12',
      type: 'Loisir',
      importedAt: new Date()
    }).returning();

    const order = await db.insert(ordersTable).values({
      seasonId: '25-26',
      memberId: member.id,
      productId: product.id,
      quantity: 2,
      totalAmount: 3000,
      paymentMethod: 'cheque',
      status: 'pending',
      createdAt: new Date()
    }).returning().get();

    expect(order.id).toBeDefined();
    expect(order.productId).toBe(product.id);
    expect(order.quantity).toBe(2);
    expect(order.totalAmount).toBe(3000);
  });

  it('should insert and query categories correctly', async () => {
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

    // List seeded categories (our migration seeds 14 default categories)
    const list = await db.select().from(categoriesTable).all();
    expect(list.length).toBeGreaterThanOrEqual(14);

    const volantCat = list.find(c => c.adherentLabel === 'Volants');
    expect(volantCat).toBeDefined();
    expect(volantCat?.adminLabel).toBe('Volants (vente ou achat)');
    expect(volantCat?.adherentLabel).toBe('Volants');
    expect(volantCat?.hideInExpenses).toBe(false);

    const salaireCat = list.find(c => c.adminLabel === 'Salaires et Charges');
    expect(salaireCat).toBeDefined();
    expect(salaireCat?.hideInExpenses).toBe(true);
  });

  it('should support creating and querying account classes', async () => {
    const mockD1 = new MockD1Database();
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

    const testClass = {
      code: '63',
      label: '63 - Impôts et taxes',
      type: 'depense' as const,
      createdAt: new Date('2026-07-07T12:00:00Z')
    };

    const insertResult = await db.insert(accountClassesTable).values(testClass).run();
    expect(insertResult.success).toBe(true);

    const list = await db.select().from(accountClassesTable).all();
    expect(list).toHaveLength(1);
    expect(list[0].code).toBe('63');
    expect(list[0].label).toBe('63 - Impôts et taxes');
    expect(list[0].type).toBe('depense');
  });

  it('should support creating invoices and items', async () => {
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
    let season = await db.select().from(seasonsTable).all().then(r => r.find(s => s.id === '25-26'));
    if (!season) {
      const insertedSeasons = await db.insert(seasonsTable).values({ id: '25-26', name: 'Saison 25-26', active: true, createdAt: new Date() }).returning();
      season = insertedSeasons[0];
    }
    const invoice = await db.insert(invoicesTable).values({
      invoiceNumber: 'FAC-2526-NBA91-0001',
      seasonId: season!.id,
      date: '2026-07-14',
      dueDate: '2026-08-14',
      clientName: 'Ligue IDF',
      totalAmount: 10000,
      createdAt: new Date()
    }).returning().then(r => r[0]);

    const item = await db.insert(invoiceItemsTable).values({
      invoiceId: invoice.id,
      description: 'Stage Jeunes',
      quantity: 1,
      unitPrice: 10000,
      totalPrice: 10000,
      createdAt: new Date()
    }).returning().then(r => r[0]);

    expect(invoice.id).toBeDefined();
    expect(item.id).toBeDefined();
  });
});

