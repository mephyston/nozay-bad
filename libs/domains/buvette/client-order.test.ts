import { beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { setupMockDb } from '@nba/db/test-utils';
import { categoriesTable, seasonsTable } from '@nba/accounting/schema';
import { buvetteCardsTable, buvetteOrdersTable } from './shared/schema';
import { signCardToken } from './shared/card-tokens';
import { createItem, updateItem } from './manage-items/handler';
import { openSession } from './open-session/handler';
import { closeSession } from './close-session/handler';
import { getCurrentSession } from './get-current-session/handler';
import { openCard } from './open-card/handler';
import { scanCard } from './scan-card/handler';
import { createSale } from './create-sale/handler';
import { cancelSale } from './cancel-sale/handler';
import { deleteCard, issueQrToken } from './card-wallet/handler';
import { listSessionSales } from './list-session-sales/handler';
import { abandonSale } from './verify-card-attempt/handler';
import { cancelOrder, createOrder, getCatalog, getCurrentOrder } from './client-order/handler';
import { getPendingOrder, listPendingOrders, readSearch } from './list-orders/handler';

const SECRET = 'secret-de-test';
const BY = 'benevole@example.org';

describe('commandes des clients', () => {
  let db: any;
  let category: number;
  let coffee: any;
  let sandwich: any;
  let sessionId: number;
  let client: { cardId: number; deviceId: string };

  const balance = async (cardId: number) => (await db.select().from(buvetteCardsTable).where(eq(buvetteCardsTable.id, cardId)).get()).balanceCents;
  const fund = (cardId: number, balanceCents: number) => db.update(buvetteCardsTable).set({ balanceCents }).where(eq(buvetteCardsTable.id, cardId));
  const collect = (orderId: number, expectedCashCents: number, clientId = `caisse-${orderId}`, extra = {}) =>
    createSale(db, SECRET, { clientId, lines: [], orderId, expectedCashCents, createdByEmail: BY, ...extra });

  beforeEach(async () => {
    db = (await setupMockDb()).db;
    await db.insert(seasonsTable).values({
      code: '25-26', name: 'Saison 2025-2026', startDate: '2025-09-01', endDate: '2026-08-31', active: true, closedAt: null, createdAt: new Date()
    });
    category = (await db.select().from(categoriesTable).where(eq(categoriesTable.adminLabel, 'Buvettes')).get()).id;
    coffee = await createItem(db, { name: 'Café', priceCents: 100 });
    sandwich = await createItem(db, { name: 'Sandwich', priceCents: 400 });
    sessionId = (await openSession(db, { openingFloatCents: 5000, accountingCategoryId: category, openedByEmail: BY })).id;
    client = await openCard(db, 'client@example.org');
  });

  const order = () => createOrder(db, client.cardId, client.deviceId, [{ itemId: coffee.id, quantity: 2 }, { itemId: sandwich.id, quantity: 1 }]);

  it('un article retiré de la vente disparaît du catalogue et ne se commande plus', async () => {
    await updateItem(db, sandwich.id, { name: 'Sandwich', priceCents: 400, active: false });
    expect((await getCatalog(db)).items.map((i) => i.name)).toEqual(['Café']);
    await expect(order()).rejects.toThrow("n'est plus disponible");
  });

  it('la buvette fermée ne prend pas de commande', async () => {
    await closeSession(db, { sessionId, countedCashCents: 5000, closedByEmail: BY });
    expect((await getCatalog(db)).open).toBe(false);
    await expect(order()).rejects.toThrow('fermée');
  });

  it('le numéro repart à 1 à chaque session, et une commande passée ne suit pas', async () => {
    const other = await openCard(db, 'autre@example.org');
    const first = await order();
    const second = await createOrder(db, other.cardId, other.deviceId, [{ itemId: coffee.id, quantity: 1 }]);
    expect([first!.number, second!.number]).toEqual([1, 2]);

    await closeSession(db, { sessionId, countedCashCents: 5000, closedByEmail: BY });
    await openSession(db, { openingFloatCents: 0, accountingCategoryId: category, openedByEmail: BY });
    expect(await getCurrentOrder(db, client.cardId, client.deviceId)).toBeNull();
    const next = await createOrder(db, other.cardId, other.deviceId, [{ itemId: coffee.id, quantity: 2 }]);
    expect(next!.number).toBe(1);
    expect(next!.id).not.toBe(second!.id);
    expect((await listPendingOrders(db, '1'))[0].id).toBe(next!.id);
  });

  it('une commande ne débite rien, et sa modification garde son numéro', async () => {
    await fund(client.cardId, 1000);
    const first = await order();
    expect(first).toMatchObject({ totalCents: 600 });
    expect(await balance(client.cardId)).toBe(1000);
    const second = await createOrder(db, client.cardId, client.deviceId, [{ itemId: coffee.id, quantity: 1 }]);
    expect(second!.id).toBe(first!.id);
    expect(second!.lines).toEqual([expect.objectContaining({ name: 'Café', quantity: 1 })]);
    expect((await getCurrentOrder(db, client.cardId, client.deviceId))?.totalCents).toBe(100);
    expect(await listPendingOrders(db)).toHaveLength(1);
  });

  it('le scan du QR code désigne la commande', async () => {
    const placed = await order();
    const { token } = await issueQrToken(db, SECRET, client.cardId, client.deviceId);
    expect((await scanCard(db, SECRET, token)).pendingOrderId).toBe(placed!.id);
  });

  it('se retrouve par numéro ou par adresse, sans la dévoiler', async () => {
    const placed = await order();
    expect((await listPendingOrders(db, String(placed!.number)))[0]).toMatchObject({ id: placed!.id, label: 'cl***@example.org', totalCents: 600 });
    expect(await listPendingOrders(db, `n° ${placed!.number}`)).toHaveLength(1);
    expect(await listPendingOrders(db, 'CLIENT@')).toHaveLength(1);
    expect(await listPendingOrders(db, 'cli')).toHaveLength(1);
    expect(await listPendingOrders(db, 'personne')).toHaveLength(0);
    expect(await listPendingOrders(db, 'ie@')).toHaveLength(0);
    expect(await listPendingOrders(db, 'cl')).toHaveLength(0);
    expect(await listPendingOrders(db, '%%%')).toHaveLength(0);
    expect(readSearch('  ')).toEqual({ number: null, email: null });
  });

  it('s\'encaisse sans QR code : la carte vient de la commande', async () => {
    await fund(client.cardId, 1000);
    const placed = await order();
    const { sale } = await collect(placed!.id, 0);
    expect(sale).toMatchObject({ status: 'paid', prepaidCents: 600, orderId: placed!.id });
    expect(await balance(client.cardId)).toBe(400);
    expect(await getCurrentOrder(db, client.cardId, client.deviceId)).toBeNull();
    await expect(getPendingOrder(db, placed!.id)).rejects.toThrow('plus en cours');
  });

  it('une carte trop courte laisse le reste à la caisse', async () => {
    await fund(client.cardId, 200);
    const placed = await order();
    expect((await collect(placed!.id, 400)).sale).toMatchObject({ prepaidCents: 200, cashCents: 400 });
  });

  it('deux caisses n\'encaissent pas la même commande', async () => {
    await fund(client.cardId, 1000);
    const placed = await order();
    await collect(placed!.id, 0, 'caisse-a');
    await expect(collect(placed!.id, 0, 'caisse-b')).rejects.toThrow('déjà été encaissée');
    expect(await balance(client.cardId)).toBe(400);
  });

  it('une CB abandonnée rend la commande au client', async () => {
    const placed = await order();
    const { sale } = await collect(placed!.id, 600, 'caisse-cb', { payRestByCard: true });
    expect(await getCurrentOrder(db, client.cardId, client.deviceId)).toBeNull();
    await abandonSale(db, async () => ({ status: 'failed' }), sale.id, BY);
    expect((await getCurrentOrder(db, client.cardId, client.deviceId))?.id).toBe(placed!.id);
    expect((await collect(placed!.id, 600, 'caisse-especes')).sale.status).toBe('paid');
  });

  it('une commande encaissée pendant la modification n\'est pas modifiée', async () => {
    await fund(client.cardId, 1000);
    const placed = await order();
    await collect(placed!.id, 0);
    const next = await createOrder(db, client.cardId, client.deviceId, [{ itemId: coffee.id, quantity: 1 }]);
    expect(next!.id).not.toBe(placed!.id);
    const [sold] = (await listSessionSales(db)).filter((entry) => entry.kind === 'sale');
    expect(sold.lines).toHaveLength(2);
  });

  it('un abandon de CB aboutit même si le client a repassé une commande', async () => {
    await fund(client.cardId, 200);
    const placed = await order();
    const { sale } = await collect(placed!.id, 400, 'caisse-cb', { payRestByCard: true });
    const next = await createOrder(db, client.cardId, client.deviceId, [{ itemId: coffee.id, quantity: 1 }]);
    expect((await abandonSale(db, async () => ({ status: 'failed' }), sale.id, BY))?.status).toBe('cancelled');
    const row = await db.select().from(buvetteCardsTable).where(eq(buvetteCardsTable.id, client.cardId)).get();
    expect(row.reservedCents).toBe(0);
    expect((await getCurrentOrder(db, client.cardId, client.deviceId))?.id).toBe(next!.id);
    const old = await db.select().from(buvetteOrdersTable).where(eq(buvetteOrdersTable.id, placed!.id)).get();
    expect(old.status).toBe('cancelled');
  });

  it('une commande annulée à l\'instant de l\'encaissement annule la vente, sans rien débiter', async () => {
    await fund(client.cardId, 1000);
    const placed = await order();
    const original = db.batch.bind(db);
    db.batch = async (statements: any) => {
      db.batch = original;
      await cancelOrder(db, client.cardId, client.deviceId);
      return original(statements);
    };
    await expect(collect(placed!.id, 0)).rejects.toThrow('vient d\'être annulée');
    expect(await balance(client.cardId)).toBe(1000);
  });

  it('une commande d\'un service passé ne s\'encaisse pas', async () => {
    const placed = await order();
    await closeSession(db, { sessionId, countedCashCents: 5000, closedByEmail: BY });
    await openSession(db, { openingFloatCents: 0, accountingCategoryId: category, openedByEmail: BY });
    await expect(collect(placed!.id, 600)).rejects.toThrow('service précédent');
    expect(await listPendingOrders(db)).toEqual([]);
  });

  it('une commande modifiée depuis l\'écran de la caisse est refusée', async () => {
    await fund(client.cardId, 1000);
    const placed = await order();
    await expect(collect(placed!.id, 0, 'caisse-x', { expectedOrderCents: 100 })).rejects.toThrow('modifier sa commande');
  });

  it('supprimer sa carte annule sa commande en cours', async () => {
    await order();
    await deleteCard(db, client.cardId, client.deviceId);
    expect(await listPendingOrders(db)).toEqual([]);
  });

  it('le client peut annuler sa commande', async () => {
    await order();
    await cancelOrder(db, client.cardId, client.deviceId);
    expect(await getCurrentOrder(db, client.cardId, client.deviceId)).toBeNull();
    const rows = await db.select().from(buvetteOrdersTable).all();
    expect(rows[0].status).toBe('cancelled');
  });

  describe('remboursement d\'une vente', () => {
    it('la part carte revient sur la carte, les espèces se rendent', async () => {
      await fund(client.cardId, 200);
      const placed = await order();
      const { sale } = await collect(placed!.id, 400);
      expect(await cancelSale(db, { saleId: sale.id, cancelledByEmail: BY })).toMatchObject({ cardCreditedCents: 200, cashToReturnCents: 400, sumUpToRefundCents: 0 });
      expect(await balance(client.cardId)).toBe(200);
    });

    it('rend la commande au client : elle s\'encaisse de nouveau, une fois la carte rechargée', async () => {
      const placed = await order();
      const { sale } = await collect(placed!.id, 600, 'caisse-especes');
      await cancelSale(db, { saleId: sale.id, cancelledByEmail: BY });
      expect((await getCurrentOrder(db, client.cardId, client.deviceId))?.id).toBe(placed!.id);
      expect((await getPendingOrder(db, placed!.id)).number).toBe(placed!.number);
      await fund(client.cardId, 1000);
      expect((await collect(placed!.id, 0, 'caisse-carte')).sale).toMatchObject({ status: 'paid', prepaidCents: 600, orderId: placed!.id });
    });

    it('annule l\'ancienne commande si le client en a repassé une entre-temps', async () => {
      const placed = await order();
      const { sale } = await collect(placed!.id, 600, 'caisse-especes');
      const next = await createOrder(db, client.cardId, client.deviceId, [{ itemId: coffee.id, quantity: 1 }]);
      await cancelSale(db, { saleId: sale.id, cancelledByEmail: BY });
      expect((await getCurrentOrder(db, client.cardId, client.deviceId))?.id).toBe(next!.id);
      const old = await db.select().from(buvetteOrdersTable).where(eq(buvetteOrdersTable.id, placed!.id)).get();
      expect(old.status).toBe('cancelled');
    });

    it('si la carte n\'existe plus, sa part sort en espèces', async () => {
      await fund(client.cardId, 300);
      const { token } = await signCardToken(SECRET, 'scan', client.cardId, client.deviceId);
      const { sale } = await createSale(db, SECRET, {
        clientId: 'vente-carte', lines: [{ itemId: coffee.id, quantity: 3 }], prepaidScanToken: token, expectedCashCents: 0, createdByEmail: BY
      });
      await deleteCard(db, client.cardId, client.deviceId);

      const [listed] = await listSessionSales(db);
      expect(listed).toMatchObject({ prepaidCardDeleted: true, prepaidCardLabel: null });

      expect(await cancelSale(db, { saleId: sale.id, cancelledByEmail: BY })).toMatchObject({ cardCreditedCents: 0, cashToReturnCents: 300 });
      expect(await balance(client.cardId)).toBe(0);
      expect((await getCurrentSession(db))?.expectedCashCents).toBe(4700);
      expect(await closeSession(db, { sessionId, countedCashCents: 4700, closedByEmail: BY })).toMatchObject({ gapCents: 0, refundsCents: 300, prepaidCents: 0 });
    });
  });
});
