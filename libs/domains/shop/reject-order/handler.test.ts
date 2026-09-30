import { describe, it, expect, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { setupMockDb } from '@nba/db/test-utils';
import { rejectOrder } from './handler';
import { ordersTable, productsTable, productCategoriesTable } from '../shared/schema';
import { seasonsTable } from '@nba/accounting/schema';
import { pushMessagesTable } from '@nba/notifications/schema';
import { OrderInvalidOrProcessedError } from '../shared/errors';
import type { OrderStatus } from '../shared/order';
import { insertMemberFixture } from '@nba/members/test-fixtures';

describe('rejectOrder (refus, avec ou sans motif)', () => {
  let db: any;
  let mockD1: any;
  let seasonId: number;
  let memberId: number;
  let paymentMethodId: number;
  let productId: number;

  async function seedOrder(status: OrderStatus) {
    return db.insert(ordersTable).values({
      seasonId,
      memberId,
      productId,
      quantity: 1,
      totalAmountCents: 1500,
      paymentMethodId,
      status,
      createdAt: new Date()
    }).returning().get();
  }

  const derniereNotification = () =>
    db.select().from(pushMessagesTable).where(eq(pushMessagesTable.source, 'order:rejected')).get();

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
      label: 'Maillots (test)',
      accountingCategoryId: catRes.results[0].id as number,
      createdAt: new Date()
    }).returning().get();

    const product = await db.insert(productsTable).values({
      name: 'Maillot club',
      productCategoryId: productCategory.id,
      priceCents: 1500,
      stock: 5,
      trackStock: true,
      active: true,
      createdAt: new Date()
    }).returning().get();
    productId = product.id;
  });

  it('garde le motif sur la commande et le dit à l\'adhérent', async () => {
    const order = await seedOrder('created');

    const result = await rejectOrder(db, { id: order.id, reason: '  Taille épuisée chez le fournisseur.  ' });

    expect(result.status).toBe('rejected');
    // Les blancs de saisie ne sont pas gardés.
    expect(result.rejectionReason).toBe('Taille épuisée chez le fournisseur.');

    const notification = await derniereNotification();
    expect(notification.body).toContain('Motif : Taille épuisée chez le fournisseur.');
    expect(notification.url).toBe('/mon-compte/commandes');
  });

  it('refuse sans motif comme avant, et renvoie alors vers le bureau', async () => {
    const order = await seedOrder('created');

    const result = await rejectOrder(db, { id: order.id, reason: '   ' });

    expect(result.status).toBe('rejected');
    expect(result.rejectionReason).toBeNull();
    const notification = await derniereNotification();
    expect(notification.body).toContain('Rapprochez-vous du bureau');
  });

  it("refuse de refuser une commande déjà validée : elle s'annule", async () => {
    const order = await seedOrder('awaiting_payment');

    await expect(rejectOrder(db, { id: order.id, reason: 'Trop tard' })).rejects.toThrowError(
      OrderInvalidOrProcessedError
    );
    const untouched = await db.select().from(ordersTable).where(eq(ordersTable.id, order.id)).get();
    expect(untouched.rejectionReason).toBeNull();
  });
});
