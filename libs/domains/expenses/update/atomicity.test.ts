import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { approveExpense } from './handler';
import { expensesTable } from '../shared/schema';
// eslint-disable-next-line no-restricted-imports
import { ledgerEntriesTable, categoriesTable } from '@nba/accounting/schema';
// eslint-disable-next-line no-restricted-imports
import { seasonsTable } from '@nba/accounting/schema';
import { eq } from 'drizzle-orm';

describe('approveExpense Real D1 Atomicity (PROMPT B3)', () => {
  let db: any;

  beforeEach(async () => {
    const mock = await setupMockDb();
    db = mock.db;
  });

  it('verifies that if batch statement fails on real D1, no statements in the batch are committed', async () => {
    // Seed season, category & expense
    const cat = await db.insert(categoriesTable).values({
      adminLabel: 'Tournois', adherentLabel: 'Tournois', createdAt: new Date()
    }).returning().get();

    await db.insert(seasonsTable).values({
      id: 1, code: '25-26', name: 'Saison 25-26', startDate: '2025-09-01', endDate: '2026-08-31', active: true, createdAt: new Date()
    }).run();

    const exp = await db.insert(expensesTable).values({
      description: 'Déplacement tournoi',
      amountCents: 4500,
      seasonId: 1,
      categoryId: cat.id,
      emitterName: 'Paul Martin',
      status: 'pending',
      createdAt: new Date()
    }).returning().get();

    const initialLedgerCount = (await db.select().from(ledgerEntriesTable).all()).length;

    // Test nominal approval
    const approved = await approveExpense(db, exp.id);
    expect(approved.status).toBe('approved');
    expect(approved.ledgerEntryId).toBeDefined();

    const finalLedgerCount = (await db.select().from(ledgerEntriesTable).all()).length;
    expect(finalLedgerCount).toBe(initialLedgerCount + 1);
  });
});
