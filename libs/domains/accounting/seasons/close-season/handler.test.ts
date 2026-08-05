import { seasonsTable } from '@nba/accounting/schema';
import { ledgerEntriesTable, categoriesTable } from '@nba/accounting/schema';
import { describe, it, expect, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';

import { setupMockDb } from '@nba/db/test-utils';
import { closeSeason, getCloseSeasonChecks, reopenSeason } from './handler';
import { bankStatementLinesTable, checkDepositsTable, checksTable, seasonBalancesTable } from '../../shared/schema';
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

  it('refuses closing an already closed season', async () => {
    // Perform initial closure
    await closeSeason(db, '24-25');

    // Second closure attempt should be blocked
    const checks = await getCloseSeasonChecks(db, '24-25');
    expect(checks.canClose).toBe(false);
    expect(checks.blockingItems.some(i => i.code === 'ALREADY_CLOSED')).toBe(true);

    await expect(closeSeason(db, '24-25')).rejects.toThrow('Clôture refusée');
  });

  it('leaves season open if rollover batch fails and allows clean retry', async () => {
    // Spy on db.batch to throw error on first call
    const originalBatch = db.batch.bind(db);
    let failOnce = true;
    db.batch = async (stmts: any[]) => {
      if (failOnce) {
        failOnce = false;
        throw new Error('Simulated D1 write failure during rollover');
      }
      return originalBatch(stmts);
    };

    // First attempt fails during rollover
    await expect(closeSeason(db, '24-25')).rejects.toThrow('Simulated D1 write failure during rollover');

    // Verify season remains OPEN (closedAt is null) because UPDATE seasons SET closed_at = now was at the end of the batch
    const seasonData = await db.select().from(seasonsTable).where(eq(seasonsTable.id, 1)).get();
    expect(seasonData.closedAt).toBeNull();

    // Retry attempt succeeds
    const res = await closeSeason(db, '24-25');
    expect(res.season.closedAt).not.toBeNull();
  });

  it('handles retry and overwrite without producing duplicate initial balances', async () => {
    // First successful closure with overwrite
    await closeSeason(db, '24-25');

    // Verify balance inserted
    const season2BalancesInitial = await db.select().from(seasonBalancesTable).where(eq(seasonBalancesTable.seasonId, 2)).all();
    const initialCount = season2BalancesInitial.length;

    // Reopen and re-close
    await reopenSeason(db, '24-25');
    await closeSeason(db, '24-25');

    // Count should be identical (no duplicates due to ON CONFLICT DO UPDATE)
    const season2BalancesFinal = await db.select().from(seasonBalancesTable).where(eq(seasonBalancesTable.seasonId, 2)).all();
    expect(season2BalancesFinal.length).toBe(initialCount);
  });

  it('blocks closure if unvalidated paid shop orders exist', async () => {
    // Insert an order with paidAt set but status pending on season 1
    const { ordersTable, productsTable, productCategoriesTable } = await import('@nba/shop/schema');
    const { paymentMethodsTable } = await import('@nba/accounting/schema');
    const { sql } = await import('drizzle-orm');

    const member = await db.get(sql`
      INSERT INTO members (licence, season_id, last_name, first_name, gender, birth_date, status, type, imported_at)
      VALUES ('999111', 1, 'Valentin', 'Luc', 'M', '1990-01-01', 'valide', 'senior', strftime('%s', 'now'))
      RETURNING id
    `) as { id: number };

    const pCat = await db.insert(productCategoriesTable).values({
      // `product_categories.label` est unique : le seed a déjà une famille « Cordages ».
      label: 'Cordages (test)', accountingCategoryId: 1, createdAt: new Date()
    }).returning().get();

    const product = await db.insert(productsTable).values({
      name: 'Cordage BG65', productCategoryId: pCat.id, priceCents: 1200, stock: 10, active: true, createdAt: new Date()
    }).returning().get();

    const pm = await db.select().from(paymentMethodsTable).all();

    await db.insert(ordersTable).values({
      seasonId: 1,
      memberId: member.id,
      productId: product.id,
      quantity: 1,
      totalAmountCents: 1200,
      paymentMethodId: pm[0].id,
      paidAt: '2025-05-15',
      status: 'pending',
      createdAt: new Date()
    });

    const checks = await getCloseSeasonChecks(db, '24-25');
    expect(checks.canClose).toBe(false);
    expect(checks.blockingItems.some(i => i.code === 'UNVALIDATED_PAID_ORDERS')).toBe(true);

    await expect(closeSeason(db, '24-25')).rejects.toThrow("commande(s) boutique payée(s) non validée(s)");
  });
});
