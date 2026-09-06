import { ledgerEntriesTable, seasonsTable } from '@nba/accounting/schema';
import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { createCheck, updateCheck } from './handler';
import { checksTable } from '../../shared/schema';
import { eq } from 'drizzle-orm';

describe('createCheck Real D1 Atomicity (PROMPT B3)', () => {
  let db: any;

  beforeEach(async () => {
    const mock = await setupMockDb();
    db = mock.db;
  });

  it('verifies that if a batch statement fails on real D1, no statements in the batch are committed', async () => {
    const initialChecks = (await db.select().from(checksTable).all()).length;
    const initialLedger = (await db.select().from(ledgerEntriesTable).all()).length;

    // Call createCheck with an invalid seasonId (or cause batch failure by passing invalid data)
    // E.g. Passing a duplicate check ID or violating a NOT NULL / FK constraint in statement 2
    try {
      await createCheck(db, {
        seasonId: 1,
        number: '1234567',
        amount: 15000,
        emitter: 'Jean Dupont',
        // Pass a memberId that does NOT exist to trigger FK constraint violation on statement 3
        memberId: 999999
      } as any);
    } catch (err: any) {
      expect(err).toBeDefined();
    }

    const finalChecks = (await db.select().from(checksTable).all()).length;
    const finalLedger = (await db.select().from(ledgerEntriesTable).all()).length;

    // Verify atomicity: ledger entry in statement 1 MUST NOT exist if statement 3 failed!
    expect(finalChecks).toBe(initialChecks);
    expect(finalLedger).toBe(initialLedger);
  });

  it("laisse le chèque et sa recette intacts quand la modification échoue", async () => {
    await db.insert(seasonsTable).values({
      id: 1, code: '25-26', name: 'Saison 2025-2026', startDate: '2025-09-01', endDate: '2026-08-31', active: true, createdAt: new Date()
    }).onConflictDoNothing().run();
    const created = await createCheck(db, { seasonId: 1, number: '7654321', amount: 15000, emitter: 'Jean Dupont' } as any);

    await expect(updateCheck(db, created.id, {
      number: '0000001', amount: 999, emitter: 'Autre', date: '2026-09-01',
      // Adhésion inexistante : la garde refuse avant le batch, rien ne doit avoir bougé.
      memberId: 999999
    })).rejects.toBeDefined();

    const check = await db.select().from(checksTable).where(eq(checksTable.id, created.id)).get();
    expect(check.number).toBe('7654321');
    expect(check.amountCents).toBe(15000);
    const ledger = await db.select().from(ledgerEntriesTable).where(eq(ledgerEntriesTable.id, created.ledgerEntryId)).get();
    expect(ledger.amountCents).toBe(15000);
  });
});
