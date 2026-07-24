import { describe, it, expect, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';

import { setupMockDb } from '@nba/db/test-utils';
import { closeSeason, getCloseSeasonChecks, reopenSeason } from './handler';
import {
  seasonsTable,
  ledgerEntriesTable,
  bankStatementLinesTable,
  checkDepositsTable,
  checksTable,
  seasonBalancesTable,
  categoriesTable
} from '../../shared/schema';
import { AppError } from '@nba/db';

describe('closeSeason (Pre-closure Checks, Rollover & Reopen - PROMPT 13)', () => {
  let db: any;

  beforeEach(async () => {
    const mock = await setupMockDb();
    db = mock.db;

    // Seed past ended season 24-25 (2024-09-01 to 2025-08-31)
    await db.insert(seasonsTable).values({
      id: 1,
      code: '24-25',
      name: 'Saison 2024-2025',
      startDate: '2024-09-01',
      endDate: '2025-08-31',
      active: false,
      closedAt: null,
      createdAt: new Date()
    });

    // Seed next season 25-26 (2025-09-01 to 2026-08-31)
    await db.insert(seasonsTable).values({
      id: 2,
      code: '25-26',
      name: 'Saison 2025-2026',
      startDate: '2025-09-01',
      endDate: '2026-08-31',
      active: true,
      closedAt: null,
      createdAt: new Date()
    });

    // Seed future season 26-27 (2026-09-01 to 2027-08-31)
    await db.insert(seasonsTable).values({
      id: 3,
      code: '26-27',
      name: 'Saison 2026-2027',
      startDate: '2026-09-01',
      endDate: '2027-08-31',
      active: false,
      closedAt: null,
      createdAt: new Date()
    });
  });

  it('rejects closing a season before its endDate', async () => {
    // Season 26-27 ends in August 2027 (future)
    const checks = await getCloseSeasonChecks(db, '26-27');
    expect(checks.canClose).toBe(false);
    expect(checks.blockingItems.some(i => i.code === 'BEFORE_END_DATE')).toBe(true);

    await expect(closeSeason(db, '26-27')).rejects.toThrow('Clôture refusée');
  });

  it('blocks closure if pending bank transactions exist', async () => {
    // Insert pending bank transaction on 24-25
    await db.insert(bankStatementLinesTable).values({
      id: 100,
      fitid: 'FIT-100',
      seasonId: 1,
      accountId: 1,
      amountCents: 5000,
      date: '2025-05-10',
      name: 'Virement suspect',
      status: 'pending',
      createdAt: new Date()
    });

    const checks = await getCloseSeasonChecks(db, '24-25');
    expect(checks.canClose).toBe(false);
    expect(checks.blockingItems.some(i => i.code === 'PENDING_BANK_TRANSACTIONS')).toBe(true);

    await expect(closeSeason(db, '24-25')).rejects.toThrow("Il reste 1 transaction(s) bancaire(s) en statut 'pending'");
  });

  it('blocks closure if unresolved check deposits exist', async () => {
    await db.insert(checkDepositsTable).values({
      id: 10,
      seasonId: 1,
      reference: 'REMISE-2025-01',
      date: '2025-06-01',
      amountCents: 15000,
      status: 'pending',
      createdAt: new Date()
    });

    const checks = await getCloseSeasonChecks(db, '24-25');
    expect(checks.canClose).toBe(false);
    expect(checks.blockingItems.some(i => i.code === 'UNRESOLVED_CHECK_DEPOSITS')).toBe(true);
  });

  it('blocks closure if checks in vault (status received) exist', async () => {
    await db.insert(checksTable).values({
      id: 50,
      seasonId: 1,
      number: 'CHK-999',
      amountCents: 4500,
      emitter: 'Dupont Marc',
      status: 'received',
      createdAt: new Date()
    });

    const checks = await getCloseSeasonChecks(db, '24-25');
    expect(checks.canClose).toBe(false);
    expect(checks.blockingItems.some(i => i.code === 'UNCLAIMED_IN_VAULT_CHECKS')).toBe(true);
  });

  it('closes season and rolls over final balances to next season when pre-checks pass', async () => {
    // Seed initial balance 10 000 € on 24-25 account 1
    await db.insert(seasonBalancesTable).values({
      id: 1,
      seasonId: 1,
      accountId: 1,
      initialBalanceCents: 1000000,
      createdAt: new Date()
    });

    // Seed transaction 2 500 € revenue on 24-25
    await db.insert(ledgerEntriesTable).values({
      id: 1,
      seasonId: 1,
      type: 'recette',
      accountId: 1,
      categoryId: 1,
      amountCents: 250000,
      date: '2025-01-15',
      paymentMethodId: 1,
      description: 'Cotisation 24-25',
      accrualType: 'normal',
      createdAt: new Date()
    });

    const checks = await getCloseSeasonChecks(db, '24-25');
    expect(checks.canClose).toBe(true);
    // Final balance = 10 000 + 2 500 = 12 500 € (1 250 000 cents)
    const acc1Bal = checks.balancesToRollover.find(b => b.accountId === 1);
    expect(acc1Bal).toBeDefined();
    expect(acc1Bal!.finalBalanceCents).toBe(1250000);

    // Perform closure
    const res = await closeSeason(db, '24-25');
    expect(res.season.closedAt).not.toBeNull();
    expect(res.nextSeasonId).toBe(2);
    expect(res.rolledOverBalances.length).toBeGreaterThan(0);

    // Verify initial balance written on next season (25-26)
    const nextSeasonBalances = await db.select().from(seasonBalancesTable).where(eq(seasonBalancesTable.seasonId, 2)).all();

    const nextAcc1 = nextSeasonBalances.find((b: any) => b.accountId === 1);
    expect(nextAcc1).toBeDefined();
    expect(nextAcc1.initialBalanceCents).toBe(1250000);
  });

  it('reopens a closed season and flags rollover cancellation', async () => {
    // First close 24-25
    await closeSeason(db, '24-25');

    // Reopen 24-25
    const reopenRes = await reopenSeason(db, '24-25');
    expect(reopenRes.season.closedAt).toBeNull();

    // Verify season is open again
    const seasonData = await db.select().from(seasonsTable).where(eq(seasonsTable.id, 1)).get();
    expect(seasonData.closedAt).toBeNull();
  });
});
