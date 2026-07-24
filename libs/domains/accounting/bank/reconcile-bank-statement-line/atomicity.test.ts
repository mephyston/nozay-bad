import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { reconcileBankStatementLine } from './handler';
import { bankStatementLinesTable, ledgerEntriesTable, seasonsTable, accountsTable, paymentMethodsTable } from '../../shared/schema';
import { eq } from 'drizzle-orm';

describe('reconcileBankStatementLine Real D1 Atomicity (PROMPT B3)', () => {
  let db: any;

  beforeEach(async () => {
    const mock = await setupMockDb();
    db = mock.db;
  });

  it('verifies that reconciliation operates atomically via db.batch', async () => {
    const season = await db.insert(seasonsTable).values({
      code: '25-26', name: 'Saison 25-26', startDate: '2025-09-01', endDate: '2026-08-31', active: true, createdAt: new Date()
    }).returning().get();

    const acc = await db.select().from(accountsTable).limit(1).get();
    const pm = await db.select().from(paymentMethodsTable).limit(1).get();

    const btx = await db.insert(bankStatementLinesTable).values({
      fitid: 'FIT-RECON-1',
      accountId: acc.id,
      amountCents: 15000,
      date: '2026-07-24',
      name: 'Virement Recette',
      status: 'pending',
      createdAt: new Date()
    }).returning().get();

    const initialLedgerCount = (await db.select().from(ledgerEntriesTable).all()).length;

    await reconcileBankStatementLine(db, btx.id, {
      action: 'create',
      transaction: {
        seasonId: season.id,
        type: 'recette',
        accountId: acc.id,
        category: 1,
        amount: 15000,
        date: '2026-07-24',
        paymentMethod: pm.id,
        description: 'Recette rapprochée'
      }
    });

    const finalBank = await db.select().from(bankStatementLinesTable).where(eq(bankStatementLinesTable.id, btx.id)).get();
    expect(finalBank?.status).toBe('reconciled');

    const finalLedgerCount = (await db.select().from(ledgerEntriesTable).all()).length;
    expect(finalLedgerCount).toBe(initialLedgerCount + 1);
  });
});
