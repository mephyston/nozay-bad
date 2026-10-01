import { describe, it, expect, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { setupMockDb } from '@nba/db/test-utils';
import { undeliverOrder } from './handler';
import { ordersTable, productsTable, productCategoriesTable } from '../shared/schema';
import { seasonsTable } from '@nba/accounting/schema';
import { OrderInvalidOrProcessedError } from '../shared/errors';
import type { OrderStatus } from '../shared/order';
import { insertMemberFixture } from '@nba/members/test-fixtures';

describe('undeliverOrder (remise cochée par erreur)', () => {
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
      paidAt: values.status === 'paid' || values.status === 'delivered' ? '2026-01-10' : null,
      deliveredAt: values.status === 'delivered' ? '2026-01-12' : null,
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

  it('remet une commande livrée à livrer, payée comme avant', async () => {
    const product = await seedProduct({ stock: 8, trackStock: true });
    const order = await seedOrder(product.id, { quantity: 1, status: 'delivered' });

    const result = await undeliverOrder(db, order.id);

    expect(result.status).toBe('paid');
    expect(result.deliveredAt).toBeNull();
    // L'encaissement n'est pas défait : un pas en arrière à la fois.
    expect(result.paidAt).toBe('2026-01-10');
  });

  it("refuse une commande qui n'a pas été livrée", async () => {
    const product = await seedProduct({ stock: 8, trackStock: true });
    const order = await seedOrder(product.id, { quantity: 1, status: 'paid' });

    await expect(undeliverOrder(db, order.id)).rejects.toThrowError(OrderInvalidOrProcessedError);
  });
});
