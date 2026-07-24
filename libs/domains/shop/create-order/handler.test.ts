import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { createOrder } from './handler';
import { productsTable, productCategoriesTable } from '../shared/schema';
import { categoriesTable, paymentMethodsTable } from '@nba/accounting/schema';
import { seasonsTable, membersTable } from '@nba/members/schema';
import { MemberNotEligibleError } from '../shared/errors';

describe('createOrder handler (Eligibility & Validation)', () => {
  let db: any;
  let seasonId: number;
  let memberId: number;
  let productId: number;
  let paymentMethodId: number;

  beforeEach(async () => {
    const mock = await setupMockDb();
    db = mock.db;

    const season = await db.insert(seasonsTable).values({
      code: '25-26', name: 'Saison 25-26', startDate: '2025-09-01', endDate: '2026-08-31', active: true, createdAt: new Date()
    }).returning().get();
    seasonId = season.id;

    const member = await db.insert(membersTable).values({
      licence: '111222', seasonId, lastName: 'Durand', firstName: 'Marie', gender: 'F', birthDate: '1995-03-20',
      status: 'valide', type: 'senior', paid: false, amountRemainingCents: 5000, importedAt: new Date()
    }).returning().get();
    memberId = member.id;

    const cat = await db.select().from(categoriesTable).all();
    const pCat = await db.insert(productCategoriesTable).values({
      label: 'Volants', accountingCategoryId: cat[0].id, createdAt: new Date()
    }).returning().get();

    const product = await db.insert(productsTable).values({
      name: 'Boîte Volants', productCategoryId: pCat.id, priceCents: 1500, stock: 10, active: true, createdAt: new Date()
    }).returning().get();
    productId = product.id;

    const pm = await db.select().from(paymentMethodsTable).all();
    paymentMethodId = pm[0].id;
  });

  it('1. Allows order creation for valid member even if installment payment is pending (paid = false)', async () => {
    const order = await createOrder(db, {
      seasonId, memberId, productId, quantity: 1, paymentMethodId
    });

    expect(order).toBeDefined();
    expect(order.status).toBe('pending');
    expect(order.totalAmountCents).toBe(1500);
  });

  it('2. Rejects order creation if member is from a different season', async () => {
    const otherSeason = await db.insert(seasonsTable).values({
      code: '24-25', name: 'Saison 24-25', startDate: '2024-09-01', endDate: '2025-08-31', active: false, createdAt: new Date()
    }).returning().get();

    await expect(createOrder(db, {
      seasonId: otherSeason.id, memberId, productId, quantity: 1, paymentMethodId
    })).rejects.toThrowError(MemberNotEligibleError);
  });

  it('3. Rejects order creation if member status is not valide (e.g. suspendu)', async () => {
    const suspendedMember = await db.insert(membersTable).values({
      licence: '333444', seasonId, lastName: 'Martin', firstName: 'Paul', gender: 'M', birthDate: '1992-01-01',
      status: 'suspendu', type: 'senior', importedAt: new Date()
    }).returning().get();

    await expect(createOrder(db, {
      seasonId, memberId: suspendedMember.id, productId, quantity: 1, paymentMethodId
    })).rejects.toThrowError(MemberNotEligibleError);
  });

  it('4. Rejects order creation if paidAt is in the future', async () => {
    await expect(createOrder(db, {
      seasonId, memberId, productId, quantity: 1, paymentMethodId, paidAt: '2099-12-31'
    })).rejects.toThrowError("La date de paiement ne peut pas être postérieure à la date du jour.");
  });
});
