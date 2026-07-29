import { describe, it, expect, beforeEach, vi } from 'vitest';
import { sql, eq } from 'drizzle-orm';
import { setupMockDb } from '@nba/db/test-utils';
import { approveOrder } from './handler';
import { ApproveOrderRepository } from './repository';
import { ordersTable, productsTable, productCategoriesTable } from '../shared/schema';
// eslint-disable-next-line no-restricted-imports
import { membersTable } from '@nba/members/schema';
// eslint-disable-next-line no-restricted-imports
import { seasonsTable } from '@nba/accounting/schema';
import { ShopCategoryNotConfiguredError } from '../shared/errors';
import { getSeasonReports } from '@nba/accounting-api';

describe('approveOrder (End-to-End Shop Order Approval & Accounting Integration)', () => {
  let db: any;
  let mockD1: any;

  // Primary keys created during seed
  let seasonId: number;
  let memberId: number;
  let virementPaymentMethodId: number;
  let especesPaymentMethodId: number;
  let currentAccountId: number;
  let cashAccountId: number;

  let volantsAccountingCatId: number;
  let cordagesAccountingCatId: number;
  let materielAccountingCatId: number;

  let volantsProductCatId: number;
  let cordagesProductCatId: number;
  let textileProductCatId: number;
  let equipmentProductCatId: number;
  let unconfiguredProductCatId: number;

  beforeEach(async () => {
    const mock = await setupMockDb();
    db = mock.db;
    mockD1 = mock.mockD1;

    // 1. Seed season 25-26 (2025-09-01 to 2026-08-31)
    const seasonRes = await db.insert(seasonsTable).values({
      code: '25-26',
      name: 'Saison 2025-2026',
      startDate: '2025-09-01',
      endDate: '2026-08-31',
      active: true,
      closedAt: null,
      createdAt: new Date()
    }).returning().get();
    seasonId = seasonRes.id;

    // 2. Seed member
    const memberRes = await db.insert(membersTable).values({
      licence: '12345678',
      seasonId: seasonId,
      lastName: 'Dupont',
      firstName: 'Jean',
      gender: 'M',
      birthDate: '1990-05-15',
      email: 'jean.dupont@example.com',
      status: 'active',
      type: 'senior',
      importedAt: new Date(),
      createdAt: new Date()
    }).returning().get();
    memberId = memberRes.id;

    // 3. Retrieve or seed accounting categories
    const catRes = await mockD1.prepare('SELECT id, admin_label as adminLabel FROM categories').all();
    const cats = catRes.results;
    const volantsCat = cats.find((c: any) => c.adminLabel === 'Volants (vente ou achat)') || cats[0];
    const cordagesCat = cats.find((c: any) => c.adminLabel === 'Cordage (vente aux adhérents)') || cats[1];
    const materielCat = cats.find((c: any) => c.adminLabel === 'Matériel (hors cordages)') || cats[2];

    volantsAccountingCatId = volantsCat.id;
    cordagesAccountingCatId = cordagesCat.id;
    materielAccountingCatId = materielCat.id;

    // 4. Retrieve or seed payment methods and accounts
    const pmRes = await mockD1.prepare('SELECT id, code FROM payment_methods').all();
    const pms = pmRes.results;
    const virPm = pms.find((p: any) => p.code === 'virement') || pms[0];
    const espPm = pms.find((p: any) => p.code === 'especes') || pms[1];
    virementPaymentMethodId = virPm.id;
    especesPaymentMethodId = espPm.id;

    const accRes = await mockD1.prepare('SELECT id, code FROM accounts').all();
    const accs = accRes.results;
    const currAcc = accs.find((a: any) => a.code === 'current') || accs[0];
    const cashAcc = accs.find((a: any) => a.code === 'cash') || accs[1];
    currentAccountId = currAcc.id;
    cashAccountId = cashAcc.id;

    // 5. Seed product categories
    // Family 1: Volants -> mapped to Volants (vente ou achat)
    const pCat1 = await db.insert(productCategoriesTable).values({
      label: 'Volants',
      accountingCategoryId: volantsAccountingCatId,
      createdAt: new Date()
    }).returning().get();
    volantsProductCatId = pCat1.id;

    // Family 2: Cordages -> mapped to Cordage (vente aux adhérents)
    const pCat2 = await db.insert(productCategoriesTable).values({
      label: 'Cordages',
      accountingCategoryId: cordagesAccountingCatId,
      createdAt: new Date()
    }).returning().get();
    cordagesProductCatId = pCat2.id;

    // Family 3: Textile -> mapped to Matériel (hors cordages)
    const pCat3 = await db.insert(productCategoriesTable).values({
      label: 'Textile',
      accountingCategoryId: materielAccountingCatId,
      createdAt: new Date()
    }).returning().get();
    textileProductCatId = pCat3.id;

    // Family 4: Equipment (different product family, but SAME accounting category as Textile: Matériel)
    const pCat4 = await db.insert(productCategoriesTable).values({
      label: 'Équipement',
      accountingCategoryId: materielAccountingCatId,
      createdAt: new Date()
    }).returning().get();
    equipmentProductCatId = pCat4.id;

    // Family 5: Unconfigured family (non-existent category ID 999999)
    unconfiguredProductCatId = 999999;
  });

  it('1. Nominal case: approves order and creates revenue ledger entry with resolved accounting category', async () => {
    // Seed product: Boîte Volants RSL (15.00 € = 1500 Cents)
    const product = await db.insert(productsTable).values({
      name: 'Boîte Volants RSL Grade 1',
      productCategoryId: volantsProductCatId,
      priceCents: 1500,
      stock: 50,
      active: true,
      createdAt: new Date()
    }).returning().get();

    // Create pending order (2 x 15.00 € = 30.00 € = 3000 Cents)
    const order = await db.insert(ordersTable).values({
      seasonId,
      memberId,
      productId: product.id,
      quantity: 2,
      totalAmountCents: 3000,
      paymentMethodId: virementPaymentMethodId,
      status: 'pending',
      createdAt: new Date()
    }).returning().get();

    // Approve order
    const result = await approveOrder(db, order.id);

    expect(result.status).toBe('approved');
    expect(result.ledgerEntryId).toBeDefined();

    // Verify ledger entry created in accounting
    const entryRes = await mockD1.prepare('SELECT * FROM ledger_entries WHERE id = ?').bind(result.ledgerEntryId!).all();
    const entry = entryRes.results[0] as any;
    expect(entry).toBeDefined();
    expect(entry.type).toBe('recette');
    expect(entry.amount_cents).toBe(3000);
    expect(entry.category_id).toBe(volantsAccountingCatId);
    expect(entry.account_id).toBe(currentAccountId);
    expect(entry.payment_method_id).toBe(virementPaymentMethodId);
    expect(entry.description).toContain('Boîte Volants RSL Grade 1 x2');
  });

  it('2. Two products from families mapped to DIFFERENT accounting categories produce two distinct lines in income statement', async () => {
    const prodVolants = await db.insert(productsTable).values({
      name: 'Volants Plume',
      productCategoryId: volantsProductCatId,
      priceCents: 2000,
      stock: 10,
      active: true,
      createdAt: new Date()
    }).returning().get();

    const prodCordage = await db.insert(productsTable).values({
      name: 'Garniture BG65',
      productCategoryId: cordagesProductCatId,
      priceCents: 1200,
      stock: 10,
      active: true,
      createdAt: new Date()
    }).returning().get();

    const order1 = await db.insert(ordersTable).values({
      seasonId, memberId, productId: prodVolants.id, quantity: 1, totalAmountCents: 2000,
      paymentMethodId: virementPaymentMethodId, status: 'pending', createdAt: new Date()
    }).returning().get();

    const order2 = await db.insert(ordersTable).values({
      seasonId, memberId, productId: prodCordage.id, quantity: 1, totalAmountCents: 1200,
      paymentMethodId: virementPaymentMethodId, status: 'pending', createdAt: new Date()
    }).returning().get();

    await approveOrder(db, order1.id);
    await approveOrder(db, order2.id);

    // Generate AG report
    const report = await getSeasonReports(db, { seasonId: '25-26' });
    const catTotals = report.compteResultat.categories;

    // Verify 2 distinct category keys exist in Income Statement
    expect(catTotals[`${volantsAccountingCatId}_recette`]).toBeDefined();
    expect(catTotals[`${volantsAccountingCatId}_recette`].total).toBe(2000);

    expect(catTotals[`${cordagesAccountingCatId}_recette`]).toBeDefined();
    expect(catTotals[`${cordagesAccountingCatId}_recette`].total).toBe(1200);
  });

  it('3. Two products from DIFFERENT product families mapped to the SAME accounting category aggregate on one single income statement line', async () => {
    // Product 1: T-Shirt Club (Textile family -> Matériel category)
    const prodTextile = await db.insert(productsTable).values({
      name: 'Maillot Club Yonex',
      productCategoryId: textileProductCatId,
      priceCents: 2500,
      stock: 20,
      active: true,
      createdAt: new Date()
    }).returning().get();

    // Product 2: Grip Raquette (Equipment family -> SAME Matériel category)
    const prodEquipment = await db.insert(productsTable).values({
      name: 'Grip Raquette Karakal',
      productCategoryId: equipmentProductCatId,
      priceCents: 500,
      stock: 30,
      active: true,
      createdAt: new Date()
    }).returning().get();

    const order1 = await db.insert(ordersTable).values({
      seasonId, memberId, productId: prodTextile.id, quantity: 1, totalAmountCents: 2500,
      paymentMethodId: virementPaymentMethodId, status: 'pending', createdAt: new Date()
    }).returning().get();

    const order2 = await db.insert(ordersTable).values({
      seasonId, memberId, productId: prodEquipment.id, quantity: 2, totalAmountCents: 1000,
      paymentMethodId: virementPaymentMethodId, status: 'pending', createdAt: new Date()
    }).returning().get();

    await approveOrder(db, order1.id);
    await approveOrder(db, order2.id);

    // Generate AG report
    const report = await getSeasonReports(db, { seasonId: '25-26' });
    const catTotals = report.compteResultat.categories;

    // Both orders aggregated into the SINGLE accounting category line: Matériel (hors cordages)
    const key = `${materielAccountingCatId}_recette`;
    expect(catTotals[key]).toBeDefined();
    expect(catTotals[key].total).toBe(3500); // 2500 + 1000 = 3500 Cents
  });

  it('4. Rejects approval when product family has no accounting category configured', async () => {
    vi.spyOn(ApproveOrderRepository.prototype, 'getProductCategoryById').mockResolvedValueOnce(null as any);

    const product = await db.insert(productsTable).values({
      name: 'Objet Mystère',
      productCategoryId: volantsProductCatId,
      priceCents: 1000,
      stock: 5,
      active: true,
      createdAt: new Date()
    }).returning().get();

    const order = await db.insert(ordersTable).values({
      seasonId, memberId, productId: product.id, quantity: 1, totalAmountCents: 1000,
      paymentMethodId: virementPaymentMethodId, status: 'pending', createdAt: new Date()
    }).returning().get();

    await expect(approveOrder(db, order.id)).rejects.toThrowError(ShopCategoryNotConfiguredError);
  });

  it('5. Approving an order paid in a past closed season creates ledger entry on active season with recette_exercice_anterieur accrual', async () => {
    // Seed closed past season 24-25 (2024-09-01 to 2025-08-31, closedAt = set)
    const closedSeason = await db.insert(seasonsTable).values({
      code: '24-25',
      name: 'Saison 2024-2025',
      startDate: '2024-09-01',
      endDate: '2025-08-31',
      active: false,
      closedAt: new Date('2025-09-02'),
      createdAt: new Date()
    }).returning().get();

    const product = await db.insert(productsTable).values({
      name: 'Grip Yonex',
      productCategoryId: volantsProductCatId,
      priceCents: 500,
      stock: 10,
      active: true,
      createdAt: new Date()
    }).returning().get();

    const order = await db.insert(ordersTable).values({
      seasonId,
      memberId,
      productId: product.id,
      quantity: 1,
      totalAmountCents: 500,
      paymentMethodId: virementPaymentMethodId,
      paidAt: '2025-08-28', // Paid inside closed season 24-25
      status: 'pending',
      createdAt: new Date()
    }).returning().get();

    const result = await approveOrder(db, order.id);

    expect(result.status).toBe('approved');
    expect(result.paidAt).toBe('2025-08-28');

    const entryRes = await mockD1.prepare('SELECT * FROM ledger_entries WHERE id = ?').bind(result.ledgerEntryId!).all();
    const entry = entryRes.results[0] as any;
    expect(entry).toBeDefined();
    expect(entry.season_id).toBe(seasonId); // Routed to current active season 25-26
    expect(entry.date).toBe('2025-08-28'); // Dated on paidAt
    expect(entry.accrual_type).toBe('recette_exercice_anterieur');
    expect(entry.accrual_note).toContain("Régularisation recette commande boutique");
  });
});
