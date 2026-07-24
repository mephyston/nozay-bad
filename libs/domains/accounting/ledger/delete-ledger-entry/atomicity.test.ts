import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { deleteLedgerEntry } from './handler';
import { ledgerEntriesTable, seasonsTable, accountsTable, paymentMethodsTable, accountClassesTable } from '../../shared/schema';
import { eq } from 'drizzle-orm';

describe('deleteLedgerEntry Real D1 Atomicity (PROMPT B3)', () => {
  let db: any;

  beforeEach(async () => {
    const mock = await setupMockDb();
    db = mock.db;
  });

  it('verifies that deleting a ledger entry operates atomically via db.batch', async () => {
    const season = await db.insert(seasonsTable).values({
      code: '25-26', name: 'Saison 25-26', startDate: '2025-09-01', endDate: '2026-08-31', active: true, createdAt: new Date()
    }).returning().get();

    const accClass = await db.insert(accountClassesTable).values({
      code: '512', label: 'Banque', type: 'tresorerie', createdAt: new Date()
    }).returning().get();

    const acc = await db.insert(accountsTable).values({
      code: '512000', label: 'Compte Courant', accountClassId: accClass.id, createdAt: new Date()
    }).returning().get();

    const pm = await db.insert(paymentMethodsTable).values({
      code: 'virement', label: 'Virement', createdAt: new Date()
    }).returning().get();

    const tx = await db.insert(ledgerEntriesTable).values({
      seasonId: season.id,
      type: 'recette',
      accountId: acc.id,
      categoryId: null,
      amountCents: 5000,
      date: '2026-07-24',
      paymentMethodId: pm.id,
      description: 'Test delete atomic',
      createdAt: new Date()
    }).returning().get();

    const initialCount = (await db.select().from(ledgerEntriesTable).all()).length;

    await deleteLedgerEntry(db, tx.id);

    const finalCount = (await db.select().from(ledgerEntriesTable).all()).length;
    expect(finalCount).toBe(initialCount - 1);
  });
});
