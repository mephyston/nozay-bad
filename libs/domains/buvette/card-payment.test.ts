import { beforeEach, describe, expect, it, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { setupMockDb } from '@nba/db/test-utils';
import { categoriesTable, ledgerEntriesTable, paymentMethodsTable, seasonsTable } from '@nba/accounting/schema';
import { buvetteCardAttemptsTable, buvetteCardsTable } from './shared/schema';
import { signCardToken } from './shared/card-tokens';
import type { SumUpLookup, SumUpTransaction } from './shared/sumup';
import { createItem } from './manage-items/handler';
import { openSession } from './open-session/handler';
import { getCurrentSession } from './get-current-session/handler';
import { closeSession } from './close-session/handler';
import { createSale } from './create-sale/handler';
import { cancelSale } from './cancel-sale/handler';
import { refundCard } from './refund-card/handler';
import { openCard } from './open-card/handler';
import { abandonSale, retryAttempt, verifyAttempt, verifyPendingAttempts } from './verify-card-attempt/handler';
import { CardAttemptRepository } from './verify-card-attempt/repository';

const SECRET = 'secret-de-test';
const BY = 'benevole@example.org';
const success = (amountCents: number): SumUpTransaction => ({ status: 'successful', amountCents, currency: 'EUR', transactionCode: 'TAAA' });

describe('paiement par CB', () => {
  let db: any;
  let sandwich: { id: number };
  let sessionId: number;

  async function cardWith(balanceCents: number) {
    const { cardId, deviceId } = await openCard(db, 'client@example.org');
    if (balanceCents) await db.update(buvetteCardsTable).set({ balanceCents }).where(eq(buvetteCardsTable.id, cardId));
    const { token } = await signCardToken(SECRET, 'scan', cardId, deviceId);
    return { cardId, scanToken: token };
  }

  const card = (id: number) => db.select().from(buvetteCardsTable).where(eq(buvetteCardsTable.id, id)).get();
  const lookupOf = (t: SumUpTransaction): SumUpLookup => async () => t;
  const sellByCard = (values: Record<string, unknown>, clientId = 'vente-cb-01') =>
    createSale(db, SECRET, { clientId, lines: [], expectedCashCents: 0, createdByEmail: BY, payRestByCard: true, ...values } as any);

  beforeEach(async () => {
    db = (await setupMockDb()).db;
    await db.insert(seasonsTable).values({
      code: '25-26', name: 'Saison 2025-2026', startDate: '2025-09-01', endDate: '2026-08-31', active: true, closedAt: null, createdAt: new Date()
    });
    const category = await db.select().from(categoriesTable).where(eq(categoriesTable.adminLabel, 'Buvettes')).get();
    sandwich = await createItem(db, { name: 'Sandwich', priceCents: 1200 });
    sessionId = (await openSession(db, { openingFloatCents: 5000, accountingCategoryId: category.id, openedByEmail: BY })).id;
  });

  it('carte complétée par la CB : réservée, puis débitée à la confirmation de SumUp', async () => {
    const c = await cardWith(800);
    const { sale, attempt } = await sellByCard({ lines: [{ itemId: sandwich.id, quantity: 1 }], prepaidScanToken: c.scanToken, expectedCashCents: 400 });
    expect(sale).toMatchObject({ status: 'in_progress', prepaidCents: 800, cardCents: 400, cashCents: 0 });
    expect(await card(c.cardId)).toMatchObject({ balanceCents: 800, reservedCents: 800 });

    const state = await verifyAttempt(db, lookupOf(success(400)), attempt!.foreignTxId);
    expect(state).toMatchObject({ attemptStatus: 'successful', saleStatus: 'paid', anomaly: null });
    expect(await card(c.cardId)).toMatchObject({ balanceCents: 0, reservedCents: 0 });
  });

  it('une recharge par CB ne crédite la carte qu\'une fois le paiement confirmé', async () => {
    const c = await cardWith(0);
    const { attempt } = await sellByCard({ rechargeCents: 2000, rechargeScanToken: c.scanToken, expectedCashCents: 2000 });
    expect((await card(c.cardId)).balanceCents).toBe(0);
    await verifyAttempt(db, lookupOf(success(2000)), attempt!.foreignTxId);
    expect((await card(c.cardId)).balanceCents).toBe(2000);
  });

  it('une confirmation rejouée ne débite pas deux fois', async () => {
    const c = await cardWith(800);
    const { attempt } = await sellByCard({ lines: [{ itemId: sandwich.id, quantity: 1 }], prepaidScanToken: c.scanToken, expectedCashCents: 400 });
    await verifyAttempt(db, lookupOf(success(400)), attempt!.foreignTxId);
    await verifyAttempt(db, lookupOf(success(400)), attempt!.foreignTxId);
    expect(await card(c.cardId)).toMatchObject({ balanceCents: 0, reservedCents: 0 });
  });

  it('deux vérifications simultanées ne signalent pas à tort un paiement tardif', async () => {
    const { attempt } = await sellByCard({ lines: [{ itemId: sandwich.id, quantity: 1 }], expectedCashCents: 1200 });
    // La page de retour règle la vente pendant que la caisse, elle, a déjà lu la tentative.
    const getSale = CardAttemptRepository.prototype.getSale;
    const spy = vi.spyOn(CardAttemptRepository.prototype, 'getSale').mockImplementationOnce(async function (this: any, ...args: any[]) {
      spy.mockRestore();
      await verifyAttempt(db, lookupOf(success(1200)), attempt!.foreignTxId);
      return getSale.apply(this, args as any);
    });
    expect(await verifyAttempt(db, lookupOf(success(1200)), attempt!.foreignTxId)).toMatchObject({ saleStatus: 'paid', anomaly: null });
    expect((await getCurrentSession(db))?.toRefund).toEqual([]);
  });

  it('sans transaction réussie chez SumUp, rien n\'est payé', async () => {
    const { attempt } = await sellByCard({ lines: [{ itemId: sandwich.id, quantity: 1 }], expectedCashCents: 1200 });
    expect(await verifyAttempt(db, lookupOf({ status: 'unknown' }), attempt!.foreignTxId)).toMatchObject({ attemptStatus: 'pending', saleStatus: 'in_progress' });
  });

  it('un montant différent ne paie pas la vente et se signale', async () => {
    const { attempt } = await sellByCard({ lines: [{ itemId: sandwich.id, quantity: 1 }], expectedCashCents: 1200 });
    expect(await verifyAttempt(db, lookupOf(success(120)), attempt!.foreignTxId)).toMatchObject({ saleStatus: 'in_progress', anomaly: 'amount' });
    expect((await getCurrentSession(db))?.toRefund).toEqual([{ kind: 'stray', attemptId: expect.any(Number), transactionCode: 'TAAA', amountCents: 1200, anomaly: 'amount', refundStatus: null }]);
  });

  it('un échec libère le droit de relancer, sous un nouvel identifiant', async () => {
    const { sale, attempt } = await sellByCard({ lines: [{ itemId: sandwich.id, quantity: 1 }], expectedCashCents: 1200 });
    await expect(retryAttempt(db, lookupOf({ status: 'pending' }), sale.id)).rejects.toThrow('à vérifier');
    const next = await retryAttempt(db, lookupOf({ status: 'failed' }), sale.id);
    expect(next.foreignTxId).not.toBe(attempt!.foreignTxId);
    expect(next.amountCents).toBe(1200);
  });

  it('une tentative inconnue expire après 2 minutes, et se relance', async () => {
    const { sale, attempt } = await sellByCard({ lines: [{ itemId: sandwich.id, quantity: 1 }], expectedCashCents: 1200 });
    const later = Date.now() + 2 * 60 * 1000 + 1000;
    expect(await verifyAttempt(db, lookupOf({ status: 'unknown' }), attempt!.foreignTxId, later)).toMatchObject({ attemptStatus: 'expired' });
    expect((await retryAttempt(db, lookupOf({ status: 'unknown' }), sale.id, later)).foreignTxId).not.toBe(attempt!.foreignTxId);
  });

  it('un paiement terminé après l\'expiration n\'est jamais perdu', async () => {
    const { sale, attempt } = await sellByCard({ lines: [{ itemId: sandwich.id, quantity: 1 }], expectedCashCents: 1200 });
    const later = Date.now() + 2 * 60 * 1000 + 1000;
    await abandonSale(db, lookupOf({ status: 'unknown' }), sale.id, BY, later);
    expect(await verifyPendingAttempts(db, lookupOf(success(1200)), later + 60_000)).toBe(1);
    expect((await getCurrentSession(db))?.toRefund).toEqual([{ kind: 'stray', attemptId: expect.any(Number), transactionCode: 'TAAA', amountCents: 1200, anomaly: 'late', refundStatus: null }]);
    expect(attempt).toBeDefined();
  });

  it('une tentative expirée n\'est plus relue passé 24 h', async () => {
    const { sale } = await sellByCard({ lines: [{ itemId: sandwich.id, quantity: 1 }], expectedCashCents: 1200 });
    const later = Date.now() + 2 * 60 * 1000 + 1000;
    await abandonSale(db, lookupOf({ status: 'unknown' }), sale.id, BY, later);
    expect(await verifyPendingAttempts(db, lookupOf({ status: 'unknown' }), Date.now() + 25 * 3600 * 1000)).toBe(0);
  });

  it('une vente abandonnée pendant la confirmation ne débite pas la carte', async () => {
    const c = await cardWith(800);
    const { sale, attempt } = await sellByCard({ lines: [{ itemId: sandwich.id, quantity: 1 }], prepaidScanToken: c.scanToken, expectedCashCents: 400 });
    const lookup: SumUpLookup = async () => {
      await abandonSale(db, lookupOf({ status: 'failed' }), sale.id, BY);
      return success(400);
    };
    await db.update(buvetteCardAttemptsTable).set({ status: 'pending' }).where(eq(buvetteCardAttemptsTable.foreignTxId, attempt!.foreignTxId));
    expect(await verifyAttempt(db, lookup, attempt!.foreignTxId)).toMatchObject({ saleStatus: 'cancelled', anomaly: 'late' });
    expect(await card(c.cardId)).toMatchObject({ balanceCents: 800, reservedCents: 0 });
  });

  it('abandonner libère la réservation et n\'encaisse rien', async () => {
    const c = await cardWith(800);
    const { sale } = await sellByCard({ lines: [{ itemId: sandwich.id, quantity: 1 }], prepaidScanToken: c.scanToken, expectedCashCents: 400 });
    const done = await abandonSale(db, lookupOf({ status: 'failed' }), sale.id, BY);
    expect(done?.status).toBe('cancelled');
    expect(await card(c.cardId)).toMatchObject({ balanceCents: 800, reservedCents: 0 });
  });

  it('abandonner marche même si SumUp ne répond pas, et un paiement tardif reste signalé', async () => {
    const c = await cardWith(800);
    const { sale } = await sellByCard({ lines: [{ itemId: sandwich.id, quantity: 1 }], prepaidScanToken: c.scanToken, expectedCashCents: 400 });
    const down: SumUpLookup = async () => {
      throw new Error('SumUp injoignable');
    };
    expect((await abandonSale(db, down, sale.id, BY))?.status).toBe('cancelled');
    expect(await card(c.cardId)).toMatchObject({ balanceCents: 800, reservedCents: 0 });
    expect(await verifyPendingAttempts(db, lookupOf(success(400)), Date.now() + 61_000)).toBe(1);
    expect((await getCurrentSession(db))?.toRefund).toEqual([{ kind: 'stray', attemptId: expect.any(Number), transactionCode: 'TAAA', amountCents: 400, anomaly: 'late', refundStatus: null }]);
    expect(await card(c.cardId)).toMatchObject({ balanceCents: 800, reservedCents: 0 });
  });

  it('abandonner marche pendant que SumUp traite encore le paiement', async () => {
    const { sale } = await sellByCard({ lines: [{ itemId: sandwich.id, quantity: 1 }], expectedCashCents: 1200 });
    expect((await abandonSale(db, lookupOf({ status: 'pending' }), sale.id, BY))?.status).toBe('cancelled');
  });

  it('un paiement réussi découvert à l\'abandon règle la vente au lieu de l\'annuler', async () => {
    const { sale } = await sellByCard({ lines: [{ itemId: sandwich.id, quantity: 1 }], expectedCashCents: 1200 });
    expect((await abandonSale(db, lookupOf(success(1200)), sale.id, BY))?.status).toBe('paid');
  });

  it('un paiement arrivé après l\'abandon est à rembourser, et la vente reste annulée', async () => {
    const { sale, attempt } = await sellByCard({ lines: [{ itemId: sandwich.id, quantity: 1 }], expectedCashCents: 1200 });
    await abandonSale(db, lookupOf({ status: 'failed' }), sale.id, BY);
    await db.update(buvetteCardAttemptsTable).set({ status: 'pending' }).where(eq(buvetteCardAttemptsTable.foreignTxId, attempt!.foreignTxId));
    expect(await verifyAttempt(db, lookupOf(success(1200)), attempt!.foreignTxId)).toMatchObject({ saleStatus: 'cancelled', anomaly: 'late' });
    expect((await getCurrentSession(db))?.toRefund).toHaveLength(1);
  });

  it('un double appui rend la même tentative', async () => {
    const values = { lines: [{ itemId: sandwich.id, quantity: 1 }], expectedCashCents: 1200 };
    const first = await sellByCard(values);
    const second = await sellByCard(values);
    expect(second).toMatchObject({ replayed: true, attempt: first.attempt });
  });

  it('le solde réservé n\'est plus disponible pour une autre vente ni un remboursement', async () => {
    const c = await cardWith(800);
    await sellByCard({ lines: [{ itemId: sandwich.id, quantity: 1 }], prepaidScanToken: c.scanToken, expectedCashCents: 400 });
    await expect(refundCard(db, SECRET, { clientId: 'remb-cb-01', scanToken: c.scanToken, createdByEmail: BY })).rejects.toThrow('en cours');
    const { sale } = await createSale(db, SECRET, {
      clientId: 'vente-cb-02', lines: [{ itemId: sandwich.id, quantity: 1 }], prepaidScanToken: c.scanToken, expectedCashCents: 1200, createdByEmail: BY
    });
    expect(sale.prepaidCents).toBe(0);
  });

  it('une vente qui attend sa CB bloque la clôture et ne s\'annule pas comme une vente payée', async () => {
    const { sale } = await sellByCard({ lines: [{ itemId: sandwich.id, quantity: 1 }], expectedCashCents: 1200 });
    await expect(closeSession(db, { sessionId, countedCashCents: 5000, closedByEmail: BY })).rejects.toThrow('attend encore sa CB');
    await expect(cancelSale(db, { saleId: sale.id, cancelledByEmail: BY })).rejects.toThrow('abandonnez');
  });

  it('la clôture range les CB sur le compte SumUp, recharge en virement', async () => {
    const c = await cardWith(0);
    const a = await sellByCard({ lines: [{ itemId: sandwich.id, quantity: 1 }], expectedCashCents: 1200 }, 'vente-cb-11');
    const b = await sellByCard({ rechargeCents: 2000, rechargeScanToken: c.scanToken, expectedCashCents: 2000 }, 'vente-cb-12');
    await verifyAttempt(db, lookupOf(success(1200)), a.attempt!.foreignTxId);
    await verifyAttempt(db, lookupOf(success(2000)), b.attempt!.foreignTxId);

    const result = await closeSession(db, { sessionId, countedCashCents: 5000, closedByEmail: BY });
    expect(result).toMatchObject({ gapCents: 0, itemsCardCents: 1200, rechargeCardCents: 2000 });

    const sumup = await db.select().from(paymentMethodsTable).where(eq(paymentMethodsTable.code, 'sumup')).get();
    const entries = await db.select().from(ledgerEntriesTable).all();
    expect(entries.find((e: any) => e.type === 'recette')).toMatchObject({ amountCents: 1200, accountId: sumup.defaultAccountId });
    const legs = entries.filter((e: any) => e.type === 'transfert');
    expect(legs.find((e: any) => e.transferLeg === 'destination')).toMatchObject({ amountCents: 2000, accountId: sumup.defaultAccountId });
  });

  it('le cron relit seulement les tentatives de plus d\'une minute', async () => {
    const { attempt } = await sellByCard({ lines: [{ itemId: sandwich.id, quantity: 1 }], expectedCashCents: 1200 });
    const lookup = vi.fn(lookupOf(success(1200)));
    expect(await verifyPendingAttempts(db, lookup)).toBe(0);
    expect(await verifyPendingAttempts(db, lookup, Date.now() + 61_000)).toBe(1);
    expect(lookup).toHaveBeenCalledWith(attempt!.foreignTxId);
    expect((await getCurrentSession(db))?.inProgress).toEqual([]);
  });
});
