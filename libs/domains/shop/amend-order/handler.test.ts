import { describe, it, expect, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { setupMockDb } from '@nba/db/test-utils';
import { amendOrder } from './handler';
import { ordersTable, productsTable, productCategoriesTable } from '../shared/schema';
import { seasonsTable } from '@nba/accounting/schema';
import { OrderInvalidOrProcessedError, OrderNotFoundError } from '../shared/errors';
import type { OrderStatus } from '../shared/order';
import { insertMemberFixture } from '@nba/members/test-fixtures';

describe('amendOrder (l’adhérent modifie sa commande)', () => {
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

  it('modifie sa commande non validée : taille, quantité et montant, sans toucher au stock', async () => {
    const m = await seedProduct({ stock: 5, trackStock: true });
    const l = await seedProduct({ name: 'Maillot — L', stock: 5, trackStock: true, priceCents: 3000 });
    const order = await seedOrder(m.id, { quantity: 1, status: 'created' });

    const updated = await amendOrder(db, order.id, body(l.id, 2));

    expect(updated).toMatchObject({ memberId, productId: l.id, quantity: 2, totalAmountCents: 6000, status: 'created' });
    expect(await stock(m.id)).toBe(5);
    expect(await stock(l.id)).toBe(5);
  });

  const traitees: OrderStatus[] = ['awaiting_payment', 'paid', 'delivered', 'rejected', 'cancelled'];
  for (const status of traitees) {
    it(`refuse une commande au statut ${status} : le bureau l'a déjà traitée`, async () => {
      const m = await seedProduct({ stock: 5, trackStock: true });
      const order = await seedOrder(m.id, { quantity: 1, status });

      await expect(amendOrder(db, order.id, body(m.id, 2))).rejects.toBeInstanceOf(OrderInvalidOrProcessedError);
      const unchanged = await db.select().from(ordersTable).where(eq(ordersTable.id, order.id)).get();
      expect(unchanged.quantity).toBe(1);
    });
  }

  it("dit introuvable la commande d'un autre adhérent, et n'y touche pas", async () => {
    const m = await seedProduct({ stock: 5, trackStock: true });
    const order = await seedOrder(m.id, { quantity: 1, status: 'created' });

    await expect(amendOrder(db, order.id, body(m.id, 2, { memberId: memberId + 1000 }))).rejects.toBeInstanceOf(
      OrderNotFoundError
    );
    const unchanged = await db.select().from(ordersTable).where(eq(ordersTable.id, order.id)).get();
    expect(unchanged).toMatchObject({ memberId, quantity: 1 });
  });

  it("refuse de passer sur un article réservé au bureau, mais garde celui déjà commandé", async () => {
    const m = await seedProduct({ stock: 5, trackStock: false });
    const l = await seedProduct({ name: 'Maillot — L', stock: 5, trackStock: false });
    await db.update(productsTable).set({ storefront: false }).run();
    const order = await seedOrder(m.id, { quantity: 1, status: 'created' });

    await expect(amendOrder(db, order.id, body(l.id, 1))).rejects.toThrow("n'est pas proposé dans la boutique");
    const updated = await amendOrder(db, order.id, body(m.id, 2));
    expect(updated.quantity).toBe(2);
  });
});
