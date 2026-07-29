import { seasonsTable } from '@nba/accounting/schema';
import { ledgerEntriesTable, categoriesTable } from '@nba/accounting/schema';
import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { getSeasonReports } from './handler';
import { seasonCategoryBudgetsTable } from '../../shared/schema';
import { AppError } from '@nba/db';

describe('getSeasonReports (As-of Cut-off Date & Projections - PROMPT 12)', () => {
  let db: any;
  let adhCatId: number;
  let tourCatId: number;

  beforeEach(async () => {
    const mock = await setupMockDb();
    db = mock.db;

    // Retrieve categories seeded by reference data seed (0001)
    const cats = await db.select().from(categoriesTable).all();
    const adhCat = cats.find((c: any) => c.adminLabel === 'Adhésions & Inscriptions') || cats[0];
    const tourCat = cats.find((c: any) => c.adminLabel === 'Tournois Senior') || cats[1];
    adhCatId = adhCat.id;
    tourCatId = tourCat.id;

    // Seed season 25-26 (2025-09-01 to 2026-08-31)
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

    // Seed season 26-27 (2026-09-01 to 2027-08-31)
    await db.insert(seasonsTable).values({
      id: 2,
      code: '26-27',
      name: 'Saison 2026-2027',
      startDate: '2026-09-01',
      endDate: '2027-08-31',
      active: false,
      closedAt: null,
      createdAt: new Date()
    });

    // Seed Category Budgets for 25-26
    await db.insert(seasonCategoryBudgetsTable).values([
      { id: 1, seasonId: 1, categoryId: adhCatId, type: 'recette', amountCents: 2900000, createdAt: new Date() }, // Budget 29 000 €
      { id: 2, seasonId: 1, categoryId: tourCatId, type: 'recette', amountCents: 600000, createdAt: new Date() }   // Budget 6 000 €
    ]);

    // Seed Transactions for 25-26 (dated before and after 2026-06-30)
    await db.insert(ledgerEntriesTable).values([
      {
        id: 1,
        seasonId: 1,
        type: 'recette',
        accountId: 1,
        categoryId: adhCatId,
        amountCents: 2840000, // 28 400 €
        date: '2025-09-15',
        paymentMethodId: 1,
        description: 'Cotisations septembre',
        accrualType: 'normal',
        createdAt: new Date()
      },
      {
        id: 2,
        seasonId: 1,
        type: 'recette',
        accountId: 1,
        categoryId: tourCatId,
        amountCents: 420000, // 4 200 €
        date: '2026-04-10',
        paymentMethodId: 1,
        description: 'Tournois avril',
        accrualType: 'normal',
        createdAt: new Date()
      },
      {
        id: 3,
        seasonId: 1,
        type: 'recette',
        accountId: 1,
        categoryId: adhCatId,
        amountCents: 50000, // 500 € (dated in July - after 2026-06-30 cut-off)
        date: '2026-07-15',
        paymentMethodId: 1,
        description: 'Cotisation tardive juillet',
        accrualType: 'normal',
        createdAt: new Date()
      },
      // Deferred Revenue for 26-27 paid in June 2026 (produit_constate_avance)
      {
        id: 4,
        seasonId: 2, // Attached to 26-27
        type: 'recette',
        accountId: 1,
        categoryId: adhCatId,
        amountCents: 390000, // 3 900 €
        date: '2026-06-25', // Dated before cut-off 2026-06-30
        paymentMethodId: 1,
        description: 'Réinscriptions 26-27 encaissées en juin',
        accrualType: 'produit_constate_avance',
        accrualNote: 'Cotisations 26-27 encaissées d avance',
        createdAt: new Date()
      }
    ]);
  });

  it('calculates full season report when arretedAu is omitted', async () => {
    const res = await getSeasonReports(db, '25-26');
    expect(res.arretedAu).toBeNull();
    // All 3 transactions attached to 25-26 included (28400 + 4200 + 500 = 33100 €)
    expect(res.compteResultat.totalRecettes).toBe(3310000);
    expect(res.projections).toBeUndefined();
  });

  it('calculates as-of report and projection when arretedAu is provided (Volet A & B)', async () => {
    const res = await getSeasonReports(db, { seasonId: '25-26', arretedAu: '2026-06-30' });

    expect(res.arretedAu).toBe('2026-06-30');
    // Only transactions dated <= 2026-06-30 included (28400 + 4200 = 32600 €)
    expect(res.compteResultat.totalRecettes).toBe(3260000);

    // Projections (Volet B)
    expect(res.projections).toBeDefined();
    const projList = res.projections!.categories;

    // Adhésions (Realised: 28400, Budget: 29000, Remaining: 600, Projection: 29000)
    const adhProj = projList.find(p => p.categoryName === 'Adhésions & Inscriptions');
    expect(adhProj).toBeDefined();
    expect(adhProj!.realisedCents).toBe(2840000);
    expect(adhProj!.budgetCents).toBe(2900000);
    expect(adhProj!.remainingBudgetCents).toBe(60000); // 600 €
    expect(adhProj!.projectedCents).toBe(2900000);    // 29 000 €

    // Tournois (Realised: 4200, Budget: 6000, Remaining: 1800, Projection: 6000)
    const tourProj = projList.find(p => p.categoryName === 'Tournois Senior');
    expect(tourProj).toBeDefined();
    expect(tourProj!.realisedCents).toBe(420000);
    expect(tourProj!.budgetCents).toBe(600000);
    expect(tourProj!.remainingBudgetCents).toBe(180000); // 1 800 €
    expect(tourProj!.projectedCents).toBe(600000);     // 6 000 €

    // Trésorerie disponible (Available Cash & Deferred Breakdown)
    expect(res.tresorerieDisponible).toBeDefined();
    // Gross cash = 28400 + 4200 + 3900 = 36500 € (includes 26-27 deferred revenue)
    expect(res.tresorerieDisponible!.totalGrossCashCents).toBe(3650000);
    // Deferred revenue = 3 900 €
    expect(res.tresorerieDisponible!.totalDeferredRevenueCents).toBe(390000);
    // Available cash = 36500 - 3900 = 32600 €
    expect(res.tresorerieDisponible!.netAvailableCashCents).toBe(3260000);
    expect(res.tresorerieDisponible!.deferredRevenues.length).toBe(1);
    expect(res.tresorerieDisponible!.deferredRevenues[0].amountCents).toBe(390000);
  });

  it('rejects arretedAu outside season bounds', async () => {
    await expect(getSeasonReports(db, { seasonId: '25-26', arretedAu: '2025-08-15' }))
      .rejects.toThrow(AppError);
  });
});
