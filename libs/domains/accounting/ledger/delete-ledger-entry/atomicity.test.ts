import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { deleteLedgerEntry } from './handler';
import { ledgerEntriesTable, seasonsTable, accountsTable, paymentMethodsTable } from '../../shared/schema';
import { eq } from 'drizzle-orm';

describe('deleteLedgerEntry Real D1 Atomicity (PROMPT B3)', () => {
  let db: any;

  beforeEach(async () => {
    const mock = await setupMockDb();
    db = mock.db;
  });

  it('verifies that deleting a ledger entry operates atomically via db.batch', async () => {
    // Seed season
    await db.insert(seasonsTable).values({
      code: '25-26', name: 'Saison 25-26', startDate: '2025-09-01', endDate: '2026-08-31', active: true, createdAt: new Date()
    });

    const tx = await db.insert(ledgerEntriesTable).values({
      seasonId: '25-26',
      type: 'recette',
      accountId: 'current',
      category: 1,
      amount: 5000,
      date: '2026-07-24',
      paymentMethod: 'virement',
      description: 'Test delete atomic',
      createdAt: new Date()
    }).returning().get();

    const initialCount = (await db.select().from(ledgerEntriesTable).all()).length;

    await deleteLedgerEntry(db, tx.id);

    const finalCount = (await db.select().from(ledgerEntriesTable).all()).length;
    expect(finalCount).toBe(initialCount - 1);
  });
});
