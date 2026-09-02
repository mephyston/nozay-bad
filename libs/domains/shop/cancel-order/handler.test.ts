import { describe, it, expect, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { setupMockDb } from '@nba/db/test-utils';
import { cancelOrder } from './handler';
import { ordersTable, productsTable, productCategoriesTable } from '../shared/schema';
import { seasonsTable } from '@nba/accounting/schema';
import { OrderInvalidOrProcessedError } from '../shared/errors';
import type { OrderStatus } from '../shared/order';
import { insertMemberFixture } from '@nba/members/test-fixtures';

describe('cancelOrder (annulation faute de règlement)', () => {
  let db: any;
  let mockD1: any;
  let seasonId: number;
  let memberId: number;
  let paymentMethodId: number;
  let productCategoryId: number;

  async function seedProduct(values: { stock: number; trackStock: boolean }) {
    return db.insert(productsTable).values({
      name: 'Boîte Volants RSL',
      productCategoryId,
      priceCents: 1500,
      stock: values.stock,
      trackStock: values.trackStock,
      active: true,
      createdAt: new Date()
    }).returning().get();
  }

  async function seedOrder(productId: number, values: { quantity: number; status: OrderStatus }) {
    return db.insert(ordersTable).values({
      seasonId,
      memberId,
      productId,
      quantity: values.quantity,
      totalAmountCents: 1500 * values.quantity,
      paymentMethodId,
      status: values.status,
      awaitingPaymentSince: values.status === 'awaiting_payment' ? '2026-01-05' : null,
      createdAt: new Date()
    }).returning().get();
  }

  beforeEach(async () => {
    const mock = await setupMockDb();
    db = mock.db;
    mockD1 = mock.mockD1;

    const season = await db.insert(seasonsTable).values({
      code: '25-26',
      name: 'Saison 2025-2026',
      startDate: '2025-09-01',
      endDate: '2026-08-31',
      active: true,
      closedAt: null,
      createdAt: new Date()
    }).returning().get();
    seasonId = season.id;

    const member = await insertMemberFixture(db, {
      licence: '12345678',
      seasonId,
      lastName: 'Dupont',
      firstName: 'Jean',
      gender: 'M',
      birthDate: '1990-05-15',
      email: 'jean.dupont@example.com',
      status: 'valide',
      type: 'senior',
      importedAt: new Date()
    });
    memberId = member.id;

    const pmRes = await mockD1.prepare('SELECT id FROM payment_methods').all();
    paymentMethodId = pmRes.results[0].id as number;

    const catRes = await mockD1.prepare('SELECT id FROM categories').all();
    const productCategory = await db.insert(productCategoriesTable).values({
      label: 'Volants (test)',
      accountingCategoryId: catRes.results[0].id as number,
      createdAt: new Date()
    }).returning().get();
    productCategoryId = productCategory.id;
  });

  it('annule la commande et rend le stock réservé', async () => {
    const product = await seedProduct({ stock: 8, trackStock: true });
    const order = await seedOrder(product.id, { quantity: 2, status: 'awaiting_payment' });

    const result = await cancelOrder(db, order.id);

    expect(result.status).toBe('cancelled');
    // L'attente est close : plus de point de départ de relance.
    expect(result.awaitingPaymentSince).toBeNull();
    expect(result.ledgerEntryId).toBeNull();

    const updatedProduct = await db.select().from(productsTable).where(eq(productsTable.id, product.id)).get();
    expect(updatedProduct.stock).toBe(10);
  });

  it('ne touche pas au stock des produits sans suivi', async () => {
    const product = await seedProduct({ stock: 4, trackStock: false });
    const order = await seedOrder(product.id, { quantity: 2, status: 'awaiting_payment' });

    await cancelOrder(db, order.id);

    const updatedProduct = await db.select().from(productsTable).where(eq(productsTable.id, product.id)).get();
    expect(updatedProduct.stock).toBe(4);
  });

  it("refuse d'annuler une commande qui n'a pas encore été validée", async () => {
    const product = await seedProduct({ stock: 8, trackStock: true });
    const order = await seedOrder(product.id, { quantity: 2, status: 'created' });

    await expect(cancelOrder(db, order.id)).rejects.toThrowError(OrderInvalidOrProcessedError);

    // Aucun stock n'avait été réservé : il ne doit pas en apparaître.
    const untouched = await db.select().from(productsTable).where(eq(productsTable.id, product.id)).get();
    expect(untouched.stock).toBe(8);
  });

  it("refuse d'annuler une commande déjà payée", async () => {
    const product = await seedProduct({ stock: 8, trackStock: true });
    const order = await seedOrder(product.id, { quantity: 2, status: 'paid' });

    await expect(cancelOrder(db, order.id)).rejects.toThrowError(OrderInvalidOrProcessedError);
  });
});
