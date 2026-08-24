import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { eq } from 'drizzle-orm';
import { bankStatementLinesTable, ledgerEntriesTable, seasonsTable } from '../../shared/schema';
import { createLedgerEntry } from '../../ledger/create-ledger-entry/handler';
import { reconcileBankStatementLine } from './handler';

/**
 * Pointer une écriture contre une ligne de relevé prouve que l'argent est arrivé en banque.
 *
 * Sans cela, un chèque saisi `in_vault` puis rapproché gardait son statut pour toujours, et le
 * solde bancaire théorique aurait retranché son montant indéfiniment — un écart qui se serait
 * creusé chèque après chèque, sans que rien ne le signale.
 */
describe('pointage et statut', () => {
  let db: any;

  beforeEach(async () => {
    const mock = await setupMockDb();
    db = mock.db;
    await db.insert(seasonsTable).values({
      id: 1,
      code: '25-26',
      name: 'Saison 2025-2026',
      startDate: '2025-09-01',
      endDate: '2026-08-31',
      active: true,
      closedAt: null,
      createdAt: new Date()
    });
  });

  it("solde le statut d'attente d'un chèque au moment où on le pointe", async () => {
    const { id: entryId } = await createLedgerEntry(db, {
      seasonId: '1',
      type: 'recette',
      accountId: 'current',
      category: '1',
      amount: 5000,
      date: '2025-10-01',
      paymentMethod: 'cheque',
      description: 'Chèque Dupont'
    } as any);

    const before = await db.select().from(ledgerEntriesTable).where(eq(ledgerEntriesTable.id, entryId)).get();
    expect(before.status).toBe('in_vault');

    const line = await db.insert(bankStatementLinesTable).values({
      fitid: 'FIT-1',
      accountId: 1,
      amountCents: 5000,
      date: '2025-10-08',
      name: 'REMISE CHEQUE',
      status: 'pending',
      createdAt: new Date()
    }).returning().get();

    await reconcileBankStatementLine(db, line.id, { action: 'match', ledgerEntryId: entryId });

    const after = await db.select().from(ledgerEntriesTable).where(eq(ledgerEntriesTable.id, entryId)).get();
    expect(after.status).toBe('cleared');
    expect(after.bankStatementLineId).toBe(line.id);
  });
});
