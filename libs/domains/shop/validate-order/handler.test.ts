import { describe, it, expect, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { setupMockDb } from '@nba/db/test-utils';
import { validateOrder } from './handler';
import { ordersTable, productsTable, productCategoriesTable } from '../shared/schema';
import { seasonsTable } from '@nba/accounting/schema';
import { OrderInvalidOrProcessedError, InsufficientStockError } from '../shared/errors';
import type { OrderStatus } from '../shared/order';
import { insertMemberFixture } from '@nba/members/test-fixtures';

describe('validateOrder (mise en attente de paiement)', () => {
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

  it('passe la commande en attente de paiement et réserve le stock', async () => {
    const product = await seedProduct({ stock: 10, trackStock: true });
    const order = await seedOrder(product.id, { quantity: 2, status: 'created' });

    const result = await validateOrder(db, order.id);

    expect(result.status).toBe('awaiting_payment');
    // La date sert de point de départ aux relances : elle doit être posée.
    expect(result.awaitingPaymentSince).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    const updatedProduct = await db.select().from(productsTable).where(eq(productsTable.id, product.id)).get();
    expect(updatedProduct.stock).toBe(8);
  });

  it("n'écrit rien en comptabilité", async () => {
    const product = await seedProduct({ stock: 10, trackStock: true });
    const order = await seedOrder(product.id, { quantity: 1, status: 'created' });

    const result = await validateOrder(db, order.id);

    expect(result.ledgerEntryId).toBeNull();
    expect(result.paidAt).toBeNull();
    const entries = await mockD1.prepare('SELECT * FROM ledger_entries').all();
    expect(entries.results).toHaveLength(0);
  });

  it('laisse le stock intact pour un produit sans suivi de stock', async () => {
    const product = await seedProduct({ stock: 3, trackStock: false });
    const order = await seedOrder(product.id, { quantity: 2, status: 'created' });

    await validateOrder(db, order.id);

    const updatedProduct = await db.select().from(productsTable).where(eq(productsTable.id, product.id)).get();
    expect(updatedProduct.stock).toBe(3);
  });

  it('refuse quand le stock a fondu depuis la demande', async () => {
    const product = await seedProduct({ stock: 1, trackStock: true });
    const order = await seedOrder(product.id, { quantity: 2, status: 'created' });

    await expect(validateOrder(db, order.id)).rejects.toThrowError(InsufficientStockError);

    const untouched = await db.select().from(productsTable).where(eq(productsTable.id, product.id)).get();
    expect(untouched.stock).toBe(1);
  });

  it('refuse une commande déjà en attente de paiement', async () => {
    const product = await seedProduct({ stock: 10, trackStock: true });
    const order = await seedOrder(product.id, { quantity: 1, status: 'awaiting_payment' });

    await expect(validateOrder(db, order.id)).rejects.toThrowError(OrderInvalidOrProcessedError);

    // Le stock ne doit surtout pas être décrémenté une seconde fois.
    const untouched = await db.select().from(productsTable).where(eq(productsTable.id, product.id)).get();
    expect(untouched.stock).toBe(10);
  });
});
