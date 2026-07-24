import { describe, it, expect, beforeEach, vi } from 'vitest';
import { sql, eq } from 'drizzle-orm';
import { setupMockDb } from '@nba/db/test-utils';
import { approveOrder } from './handler';
import { ApproveOrderRepository } from './repository';
import { ordersTable, productsTable, productCategoriesTable } from '../shared/schema';
import { categoriesTable, ledgerEntriesTable, paymentMethodsTable, accountsTable } from '@nba/accounting/schema';
import { seasonsTable, membersTable } from '@nba/members/schema';
import { ShopCategoryNotConfiguredError } from '../shared/errors';
import { getSeasonReports } from '@nba/accounting-api';

describe('approveOrder (End-to-End Shop Order Approval & Accounting Integration)', () => {
  let db: any;

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
    const cats = await db.select().from(categoriesTable).all();
    const volantsCat = cats.find((c: any) => c.adminLabel === 'Volants (vente ou achat)') || cats[0];
    const cordagesCat = cats.find((c: any) => c.adminLabel === 'Cordage (vente aux adhérents)') || cats[1];
    const materielCat = cats.find((c: any) => c.adminLabel === 'Matériel (hors cordages)') || cats[2];

    volantsAccountingCatId = volantsCat.id;
    cordagesAccountingCatId = cordagesCat.id;
    materielAccountingCatId = materielCat.id;

    // 4. Retrieve or seed payment methods and accounts
    const pms = await db.select().from(paymentMethodsTable).all();
    const virPm = pms.find((p: any) => p.code === 'virement') || pms[0];
    const espPm = pms.find((p: any) => p.code === 'especes') || pms[1];
    virementPaymentMethodId = virPm.id;
    especesPaymentMethodId = espPm.id;

    const accs = await db.select().from(accountsTable).all();
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
    const entry = await db.select().from(ledgerEntriesTable).where(eq(ledgerEntriesTable.id, result.ledgerEntryId!)).get();
    expect(entry).toBeDefined();
    expect(entry.type).toBe('recette');
    expect(entry.amountCents).toBe(3000);
    expect(entry.categoryId).toBe(volantsAccountingCatId);
    expect(entry.accountId).toBe(currentAccountId);
    expect(entry.paymentMethodId).toBe(virementPaymentMethodId);
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
});
