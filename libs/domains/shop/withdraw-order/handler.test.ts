import { describe, it, expect, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { setupMockDb } from '@nba/db/test-utils';
import { withdrawOrder } from './handler';
import { ordersTable, productsTable, productCategoriesTable } from '../shared/schema';
import { seasonsTable } from '@nba/accounting/schema';
import { OrderInvalidOrProcessedError, OrderNotFoundError } from '../shared/errors';
import type { OrderStatus } from '../shared/order';
import { insertMemberFixture } from '@nba/members/test-fixtures';

describe('withdrawOrder (l’adhérent annule sa commande)', () => {
  let db: any;
  let mockD1: any;
  let seasonId: number;
  let memberId: number;
  let paymentCode: string;
  let paymentMethodId: number;
  let productCategoryId: number;

  async function seedProduct(values: { name?: string; stock: number; trackStock: boolean; priceCents?: number; parentId?: number }) {
    return db.insert(productsTable).values({
      name: values.name ?? 'Maillot — M',
      productCategoryId,
      priceCents: values.priceCents ?? 2500,
      stock: values.stock,
      trackStock: values.trackStock,
      active: true,
      parentId: values.parentId ?? null,
      createdAt: new Date()
    }).returning().get();
  }

  async function seedOrder(productId: number, values: { quantity: number; status: OrderStatus }) {
    return db.insert(ordersTable).values({
      seasonId, memberId, productId,
      quantity: values.quantity,
      totalAmountCents: 2500 * values.quantity,
      paymentMethodId,
      status: values.status,
      createdAt: new Date()
    }).returning().get();
  }

  const stock = async (id: number) => (await db.select().from(productsTable).where(eq(productsTable.id, id)).get()).stock;
  const body = (productId: number, quantity: number, over: Record<string, unknown> = {}) =>
    ({ memberId, productId, quantity, paymentMethod: paymentCode, ...over });

  beforeEach(async () => {
    const mock = await setupMockDb();
    db = mock.db;
    mockD1 = mock.mockD1;

    const season = await db.insert(seasonsTable).values({
      code: '25-26', name: 'Saison 2025-2026', startDate: '2025-09-01', endDate: '2026-08-31',
      active: true, closedAt: null, createdAt: new Date()
    }).returning().get();
    seasonId = season.id;

    const member = await insertMemberFixture(db, {
      licence: '12345678', seasonId, lastName: 'Dupont', firstName: 'Jean', gender: 'M',
      birthDate: '1990-05-15', email: 'jean.dupont@example.com', status: 'valide', type: 'senior', importedAt: new Date()
    });
    memberId = member.id;

    const pm = (await mockD1.prepare("SELECT id, code FROM payment_methods WHERE active = 1 AND kind != 'internal'").all()).results[0];
    paymentMethodId = pm.id as number;
    paymentCode = pm.code as string;

    const catRes = await mockD1.prepare('SELECT id FROM categories').all();
    const productCategory = await db.insert(productCategoriesTable).values({
      label: 'Textile (test)', accountingCategoryId: catRes.results[0].id as number, createdAt: new Date()
    }).returning().get();
    productCategoryId = productCategory.id;
  });

  it('annule sa commande non validée, sans mouvement de stock', async () => {
    const m = await seedProduct({ stock: 5, trackStock: true });
    const order = await seedOrder(m.id, { quantity: 2, status: 'created' });

    const result = await withdrawOrder(db, { id: order.id, memberId });

    expect(result.status).toBe('cancelled');
    expect(await stock(m.id)).toBe(5);
  });

  const traitees: OrderStatus[] = ['awaiting_payment', 'paid', 'delivered', 'rejected', 'cancelled'];
  for (const status of traitees) {
    it(`refuse une commande au statut ${status}`, async () => {
      const m = await seedProduct({ stock: 5, trackStock: true });
      const order = await seedOrder(m.id, { quantity: 1, status });

      await expect(withdrawOrder(db, { id: order.id, memberId })).rejects.toBeInstanceOf(OrderInvalidOrProcessedError);
      const unchanged = await db.select().from(ordersTable).where(eq(ordersTable.id, order.id)).get();
      expect(unchanged.status).toBe(status);
    });
  }

  it("dit introuvable la commande d'un autre adhérent, et n'y touche pas", async () => {
    const m = await seedProduct({ stock: 5, trackStock: true });
    const order = await seedOrder(m.id, { quantity: 1, status: 'created' });

    await expect(withdrawOrder(db, { id: order.id, memberId: memberId + 1000 })).rejects.toBeInstanceOf(OrderNotFoundError);
    const unchanged = await db.select().from(ordersTable).where(eq(ordersTable.id, order.id)).get();
    expect(unchanged.status).toBe('created');
  });
});
