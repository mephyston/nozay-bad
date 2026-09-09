import { describe, it, expect, beforeEach, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { setupMockDb } from '@nba/db/test-utils';
import { unpayOrder } from './handler';
import { UnpayOrderRepository } from './repository';
import { payOrder } from '../pay-order/handler';
import { ordersTable, productsTable, productCategoriesTable } from '../shared/schema';
import { seasonsTable, ledgerEntriesTable } from '@nba/accounting/schema';
import { OrderInvalidOrProcessedError, SeasonClosedError } from '../shared/errors';
import { insertMemberFixture } from '@nba/members/test-fixtures';

describe("unpayOrder (annulation d'un encaissement)", () => {
  let db: any;
  let mockD1: any;
  let seasonId: number;
  let memberId: number;
  let paymentMethodId: number;
  let productId: number;

  /** Une commande réglée par le vrai chemin : c'est son écriture qu'on doit défaire. */
  async function seedPaidOrder() {
    const order = await db.insert(ordersTable).values({
      seasonId,
      memberId,
      productId,
      quantity: 1,
      totalAmountCents: 1500,
      paymentMethodId,
      status: 'awaiting_payment',
      awaitingPaymentSince: '2026-01-05',
      createdAt: new Date()
    }).returning().get();
    return payOrder(db, { id: order.id, paidAt: '2026-01-10' });
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
      lastName: 'Casse',
      firstName: 'Maud',
      gender: 'F',
      birthDate: '1990-05-15',
      email: 'maud.casse@example.com',
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
    const product = await db.insert(productsTable).values({
      name: 'Boîte Volants RSL',
      productCategoryId: productCategory.id,
      priceCents: 1500,
      stock: 8,
      trackStock: true,
      active: true,
      createdAt: new Date()
    }).returning().get();
    productId = product.id;
  });

  it("remet la commande en attente de paiement et retire la recette du grand livre, d'un seul batch", async () => {
    const paid = await seedPaidOrder();
    expect(paid.status).toBe('paid');
    const entryId = paid.ledgerEntryId as number;

    const result = await unpayOrder(db, paid.id);

    expect(result.status).toBe('awaiting_payment');
    expect(result.paidAt).toBeNull();
    expect(result.ledgerEntryId).toBeNull();
    // La date d'attente est celle de la validation, pas celle de l'annulation.
    expect(result.awaitingPaymentSince).toBe('2026-01-05');

    const entry = await db.select().from(ledgerEntriesTable).where(eq(ledgerEntriesTable.id, entryId)).get();
    expect(entry).toBeUndefined();

    // Le stock, réservé à la validation, reste réservé : la commande est toujours due.
    const product = await db.select().from(productsTable).where(eq(productsTable.id, productId)).get();
    expect(product.stock).toBe(8);
  });

  it("la commande peut être encaissée à nouveau ensuite", async () => {
    const paid = await seedPaidOrder();
    await unpayOrder(db, paid.id);
    const again = await payOrder(db, { id: paid.id, paidAt: '2026-01-12' });
    expect(again.status).toBe('paid');
    expect(again.ledgerEntryId).not.toBeNull();
  });

  it("répare une commande dont la recette a déjà été supprimée à la main", async () => {
    // Le cas vécu : recette effacée au grand livre, commande restée « payée » avec un
    // identifiant d'écriture qui ne mène plus nulle part.
    const paid = await seedPaidOrder();
    await db.delete(ledgerEntriesTable).where(eq(ledgerEntriesTable.id, paid.ledgerEntryId as number)).run();

    const result = await unpayOrder(db, paid.id);
    expect(result.status).toBe('awaiting_payment');
    expect(result.ledgerEntryId).toBeNull();
  });

  it("refuse une commande qui n'est pas payée", async () => {
    const order = await db.insert(ordersTable).values({
      seasonId,
      memberId,
      productId,
      quantity: 1,
      totalAmountCents: 1500,
      paymentMethodId,
      status: 'awaiting_payment',
      awaitingPaymentSince: '2026-01-05',
      createdAt: new Date()
    }).returning().get();

    await expect(unpayOrder(db, order.id)).rejects.toThrowError(OrderInvalidOrProcessedError);
  });

  it('refuse une recette déjà pointée sur le relevé : la banque l’a vue', async () => {
    const paid = await seedPaidOrder();
    const entry = await db.select().from(ledgerEntriesTable).where(eq(ledgerEntriesTable.id, paid.ledgerEntryId as number)).get();
    vi.spyOn(UnpayOrderRepository.prototype, 'getLedgerEntryById').mockResolvedValueOnce({ ...entry, bankStatementLineId: 42 });

    await expect(unpayOrder(db, paid.id)).rejects.toThrow(/pointée sur un relevé/);

    // Rien n'a bougé.
    const order = await db.select().from(ordersTable).where(eq(ordersTable.id, paid.id)).get();
    expect(order.status).toBe('paid');
    expect(await db.select().from(ledgerEntriesTable).where(eq(ledgerEntriesTable.id, entry.id)).get()).toBeDefined();
  });

  it('refuse quand l’exercice de la recette est clôturé', async () => {
    const paid = await seedPaidOrder();
    await db.update(seasonsTable).set({ closedAt: new Date() }).where(eq(seasonsTable.id, seasonId)).run();

    await expect(unpayOrder(db, paid.id)).rejects.toThrowError(SeasonClosedError);
  });

  it('renvoie 404 pour une commande inconnue', async () => {
    await expect(unpayOrder(db, 999999)).rejects.toMatchObject({ status: 404 });
  });
});
