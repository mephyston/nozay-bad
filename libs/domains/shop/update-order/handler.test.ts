import { describe, it, expect, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { setupMockDb } from '@nba/db/test-utils';
import { updateOrder } from './handler';
import { ordersTable, productsTable, productCategoriesTable } from '../shared/schema';
import { seasonsTable } from '@nba/accounting/schema';
import { OrderInvalidOrProcessedError, InsufficientStockError, MemberNotEligibleError } from '../shared/errors';
import type { OrderStatus } from '../shared/order';
import { insertMemberFixture } from '@nba/members/test-fixtures';

describe('updateOrder (correction avant règlement)', () => {
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

  it('corrige une commande créée : article, quantité et montant, sans toucher au stock', async () => {
    const m = await seedProduct({ stock: 5, trackStock: true });
    const l = await seedProduct({ name: 'Maillot — L', stock: 5, trackStock: true, priceCents: 3000 });
    const order = await seedOrder(m.id, { quantity: 1, status: 'created' });

    const updated = await updateOrder(db, order.id, body(l.id, 2));

    expect(updated).toMatchObject({ productId: l.id, quantity: 2, totalAmountCents: 6000, status: 'created' });
    // Rien n'était réservé : rien ne bouge.
    expect(await stock(m.id)).toBe(5);
    expect(await stock(l.id)).toBe(5);
  });

  it('en attente de paiement, rend la réservation à l’ancien article et la prend sur le nouveau', async () => {
    const m = await seedProduct({ stock: 4, trackStock: true });
    const l = await seedProduct({ name: 'Maillot — L', stock: 3, trackStock: true });
    const order = await seedOrder(m.id, { quantity: 1, status: 'awaiting_payment' });

    await updateOrder(db, order.id, body(l.id, 2));

    expect(await stock(m.id)).toBe(5);
    expect(await stock(l.id)).toBe(1);
  });

  it('sur le même article, ne corrige le stock que de l’écart, et compte sa propre réservation', async () => {
    // Plus aucune unité libre : les deux que la commande tient lui restent acquises.
    const m = await seedProduct({ stock: 0, trackStock: true });
    const order = await seedOrder(m.id, { quantity: 2, status: 'awaiting_payment' });

    await updateOrder(db, order.id, body(m.id, 1));
    expect(await stock(m.id)).toBe(1);

    await updateOrder(db, order.id, body(m.id, 2));
    expect(await stock(m.id)).toBe(0);

    await expect(updateOrder(db, order.id, body(m.id, 3))).rejects.toBeInstanceOf(InsufficientStockError);
    expect(await stock(m.id)).toBe(0);
  });

  it('refuse une commande réglée, en disant quoi faire', async () => {
    const m = await seedProduct({ stock: 5, trackStock: true });
    const order = await seedOrder(m.id, { quantity: 1, status: 'paid' });

    await expect(updateOrder(db, order.id, body(m.id, 2))).rejects.toThrow("annulez d'abord l'encaissement");
    await expect(updateOrder(db, (await seedOrder(m.id, { quantity: 1, status: 'rejected' })).id, body(m.id, 2)))
      .rejects.toBeInstanceOf(OrderInvalidOrProcessedError);
  });

  it('refuse un article parent : c’est une de ses déclinaisons qui se commande', async () => {
    const parent = await seedProduct({ name: 'Maillot', stock: 0, trackStock: false });
    const m = await seedProduct({ stock: 5, trackStock: true, parentId: parent.id });
    const order = await seedOrder(m.id, { quantity: 1, status: 'created' });

    await expect(updateOrder(db, order.id, body(parent.id, 1))).rejects.toThrow('déclinaisons');
  });

  it("refuse de passer la commande à un adhérent d'une autre saison", async () => {
    const other = await db.insert(seasonsTable).values({
      code: '26-27', name: 'Saison 2026-2027', startDate: '2026-09-01', endDate: '2027-08-31',
      active: false, closedAt: null, createdAt: new Date()
    }).returning().get();
    const ailleurs = await insertMemberFixture(db, {
      licence: '87654321', seasonId: other.id, lastName: 'Martin', firstName: 'Léa', gender: 'F',
      birthDate: '1992-01-01', email: 'lea@example.com', status: 'valide', type: 'senior', importedAt: new Date()
    });
    const m = await seedProduct({ stock: 5, trackStock: true });
    const order = await seedOrder(m.id, { quantity: 1, status: 'created' });

    await expect(updateOrder(db, order.id, body(m.id, 1, { memberId: ailleurs.id }))).rejects.toBeInstanceOf(MemberNotEligibleError);
  });
});
