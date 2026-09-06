import { seasonsTable } from '@nba/accounting/schema';
import { describe, it, expect } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { UpdateSeasonBalancesRepository } from './repository';
import { accountClassesTable, accountsTable, seasonBalancesTable } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';

describe('UpdateSeasonBalancesRepository (Integration)', () => {
  it('inserts and upserts opening season balances via db.batch', async () => {
    const { db } = await setupMockDb();
    const repo = new UpdateSeasonBalancesRepository();

    // 1. Seed season and fetch seeded accounts
    const season = await db.insert(seasonsTable).values({
      code: '25-26',
      name: 'Saison 2025-2026',
      startDate: '2025-09-01',
      endDate: '2026-08-31',
      active: true,
      createdAt: new Date()
    }).returning().get();

    const accounts = await db.select().from(accountsTable).all();
    let accountCurrent = accounts.find(a => a.code === 'current');
    let accountSavings = accounts.find(a => a.code === 'savings');

    if (!accountCurrent) {
      const accountClass = await db.insert(accountClassesTable).values({ code: '51', label: 'Comptes', type: 'tresorerie', createdAt: new Date() }).returning().get();
      accountCurrent = await db.insert(accountsTable).values({ code: 'current', label: 'Compte Courant', accountClassId: accountClass.id, createdAt: new Date() }).returning().get();
    }
    if (!accountSavings) {
      const accountClass = await db.insert(accountClassesTable).values({ code: '51', label: 'Comptes', type: 'tresorerie', createdAt: new Date() }).returning().get();
      accountSavings = await db.insert(accountsTable).values({ code: 'savings', label: 'Livret A', accountClassId: accountClass.id, createdAt: new Date() }).returning().get();
    }

    // 2. Resolve season ID
    const resolvedId = await repo.resolveSeasonId(db, '25-26');
    expect(resolvedId).toBe(season.id);

    // 3. Initial insertion of balances
    await repo.updateBalances(db, season.id, [
      { accountId: accountCurrent.id, initialBalanceCents: 100000 },
      { accountId: accountSavings.id, initialBalanceCents: 500000 }
    ]);

    // Read back balances
    const balCurrent = await db.select().from(seasonBalancesTable)
      .where(and(eq(seasonBalancesTable.seasonId, season.id), eq(seasonBalancesTable.accountId, accountCurrent.id)))
      .get();
    expect(balCurrent).toBeDefined();
    expect(balCurrent!.initialBalanceCents).toBe(100000);

    const balSavings = await db.select().from(seasonBalancesTable)
      .where(and(eq(seasonBalancesTable.seasonId, season.id), eq(seasonBalancesTable.accountId, accountSavings.id)))
      .get();
    expect(balSavings).toBeDefined();
    expect(balSavings!.initialBalanceCents).toBe(500000);

    // 4. Upsert (update) existing balances
    await repo.updateBalances(db, season.id, [
      { accountId: accountCurrent.id, initialBalanceCents: 150000 }, // updated from 100€ to 150€
      { accountId: accountSavings.id, initialBalanceCents: 550000 }  // updated from 500€ to 550€
    ]);

    const updatedCurrent = await db.select().from(seasonBalancesTable)
      .where(and(eq(seasonBalancesTable.seasonId, season.id), eq(seasonBalancesTable.accountId, accountCurrent.id)))
      .get();
    expect(updatedCurrent!.initialBalanceCents).toBe(150000);

    const updatedSavings = await db.select().from(seasonBalancesTable)
      .where(and(eq(seasonBalancesTable.seasonId, season.id), eq(seasonBalancesTable.accountId, accountSavings.id)))
      .get();
    expect(updatedSavings!.initialBalanceCents).toBe(550000);

    // Total rows for this season should remain 2 (no duplicate rows)
    const allForSeason = await db.select().from(seasonBalancesTable)
      .where(eq(seasonBalancesTable.seasonId, season.id))
      .all();
    expect(allForSeason).toHaveLength(2);
  });

  it("écrit un solde sur un compte désigné par son code, et refuse un code inconnu", async () => {
    const { db } = await setupMockDb();
    const repo = new UpdateSeasonBalancesRepository();
    const season = await db.insert(seasonsTable).values({
      code: '26-27', name: 'Saison 2026-2027', startDate: '2026-09-01', endDate: '2027-08-31', active: true, createdAt: new Date()
    }).returning().get();
    const badnet = await db.select().from(accountsTable).where(eq(accountsTable.code, 'badnet')).get();
    expect(badnet).toBeDefined();

    await repo.updateBalances(db, season.id, [{ accountId: 'badnet', initialBalanceCents: 100000 }]);

    const row = await db.select().from(seasonBalancesTable)
      .where(and(eq(seasonBalancesTable.seasonId, season.id), eq(seasonBalancesTable.accountId, badnet!.id)))
      .get();
    expect(row?.initialBalanceCents).toBe(100000);

    // La table figée d'autrefois aurait écrit ce solde sur le compte courant, en silence.
    await expect(repo.updateBalances(db, season.id, [{ accountId: 'paypal', initialBalanceCents: 1 }]))
      .rejects.toThrow(/introuvable/);
    const onCurrent = await db.select().from(seasonBalancesTable)
      .where(and(eq(seasonBalancesTable.seasonId, season.id), eq(seasonBalancesTable.accountId, 1)))
      .get();
    expect(onCurrent).toBeUndefined();
  });
});
