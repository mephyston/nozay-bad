import { ledgerEntriesTable } from '@nba/accounting/schema';
import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { createCheck } from './handler';
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
});
