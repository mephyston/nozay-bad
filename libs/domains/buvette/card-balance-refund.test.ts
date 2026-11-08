import { beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { setupMockDb } from '@nba/db/test-utils';
import { categoriesTable, seasonsTable } from '@nba/accounting/schema';
import { buvetteCardsTable, buvetteSumUpRefundsTable } from './shared/schema';
import { signCardToken } from './shared/card-tokens';
import type { SumUpRefundOutcome, SumUpRefunds } from './shared/sumup-refunds';
import { createItem } from './manage-items/handler';
import { openSession } from './open-session/handler';
import { getCurrentSession } from './get-current-session/handler';
import { openCard } from './open-card/handler';
import { scanCard } from './scan-card/handler';
import { createSale } from './create-sale/handler';
import { refundCard } from './refund-card/handler';
import { cancelSale } from './cancel-sale/handler';
import { verifyAttempt } from './verify-card-attempt/handler';
import { refundCardPayment, settlePendingRefunds, REFUND_GIVE_UP_MS } from './refund-card-payment/handler';

const SECRET = 'secret-de-test';
const BY = 'benevole@example.org';

/** Un faux SumUp : les paiements reçus, ce qui en a été remboursé, et les demandes reçues. */
function fakeSumUp(answer: SumUpRefundOutcome['outcome'] = 'done') {
  const payments = new Map<string, { amountCents: number; refundedCents: number }>();
  const calls: { id: string; amountCents: number }[] = [];
  const state = { answer, onRefund: async () => {} };
  const client: SumUpRefunds = {
    async find(foreignTxId) {
      const p = payments.get(foreignTxId);
      return p ? { id: foreignTxId, ...p } : null;
    },
    async refund(id, amountCents) {
      calls.push({ id, amountCents });
      await state.onRefund();
      if (state.answer === 'done') payments.get(id)!.refundedCents += amountCents;
      return state.answer === 'refused' ? { outcome: 'refused', message: 'Délai dépassé' } : ({ outcome: state.answer } as SumUpRefundOutcome);
    }
  };
  return { client, payments, calls, state };
}

describe('remboursement d\'une carte sur la CB qui l\'a chargée', () => {
  let db: any;
  let coffee: { id: number };
  let card: { cardId: number; deviceId: string };
  let sumup: ReturnType<typeof fakeSumUp>;

  const scan = async () => (await signCardToken(SECRET, 'scan', card.cardId, card.deviceId)).token;
  const balance = async () => (await db.select().from(buvetteCardsTable).where(eq(buvetteCardsTable.id, card.cardId)).get()).balanceCents;
  const expectedCash = async () => (await getCurrentSession(db))!.expectedCashCents;

  async function rechargeByCard(cents: number) {
    const { attempt } = await createSale(db, SECRET, {
      clientId: `cb-${Math.random()}`, lines: [], rechargeCents: cents, rechargeScanToken: await scan(), expectedCashCents: cents, createdByEmail: BY, payRestByCard: true
    });
    sumup.payments.set(attempt!.foreignTxId, { amountCents: cents, refundedCents: 0 });
    await verifyAttempt(db, async () => ({ status: 'successful', amountCents: cents, currency: 'EUR', transactionCode: 'TAAA' }), attempt!.foreignTxId);
  }
  const rechargeByCash = async (cents: number) => createSale(db, SECRET, {
    clientId: `cash-${Math.random()}`, lines: [], rechargeCents: cents, rechargeScanToken: await scan(), expectedCashCents: cents, createdByEmail: BY
  });
  const refund = async (clientId = 'remb-carte-1') => refundCard(db, SECRET, { clientId, scanToken: await scan(), createdByEmail: BY }, sumup.client);

  beforeEach(async () => {
    db = (await setupMockDb()).db;
    await db.insert(seasonsTable).values({
      code: '25-26', name: 'Saison 2025-2026', startDate: '2025-09-01', endDate: '2026-08-31', active: true, closedAt: null, createdAt: new Date()
    });
    const category = await db.select().from(categoriesTable).where(eq(categoriesTable.adminLabel, 'Buvettes')).get();
    coffee = await createItem(db, { name: 'Café', priceCents: 500 });
    await openSession(db, { openingFloatCents: 5000, accountingCategoryId: category.id, openedByEmail: BY });
    card = await openCard(db, 'client@example.org');
    sumup = fakeSumUp();
  });

  it('rend sur la CB ce qui reste d\'une recharge par CB, sans toucher aux espèces', async () => {
    await rechargeByCard(2000);
    await createSale(db, SECRET, { clientId: 'cafe', lines: [{ itemId: coffee.id, quantity: 1 }], prepaidScanToken: await scan(), expectedCashCents: 0, createdByEmail: BY });
    expect((await scanCard(db, SECRET, (await signCardToken(SECRET, 'qr', card.cardId, card.deviceId)).token)).cbRefundableCents).toBe(1500);
    const result = await refund();
    expect(result).toMatchObject({ amountCents: 1500, cashCents: 0, cardRefunds: [{ amountCents: 1500, status: 'done' }] });
    expect(sumup.calls).toEqual([{ id: expect.any(String), amountCents: 1500 }]);
    expect(await balance()).toBe(0);
    expect(await expectedCash()).toBe(5000);
  });

  it('la recharge par CB la plus récente d\'abord, le reste en espèces', async () => {
    await rechargeByCash(1000);
    await rechargeByCard(800);
    const result = await refund();
    expect(result).toMatchObject({ amountCents: 1800, cashCents: 1000, cardRefunds: [{ amountCents: 800 }] });
    expect(await expectedCash()).toBe(5000);
  });

  it('un refus de SumUp repasse en espèces', async () => {
    await rechargeByCard(1000);
    sumup.state.answer = 'refused';
    expect(await refund()).toMatchObject({ cashCents: 1000, cardRefunds: [], cashFallbacks: [{ amountCents: 1000, reason: 'Délai dépassé' }] });
    // Rendue en espèces : la part est close, la caisse ne la réclame plus.
    expect(await db.select().from(buvetteSumUpRefundsTable).get()).toMatchObject({ status: 'cash', reason: 'card_balance' });
    expect((await getCurrentSession(db))!.toRefund).toEqual([]);
    // La recharge était passée par la CB : les 10 € rendus en espèces sortent du fond de caisse.
    expect(await expectedCash()).toBe(4000);
  });

  it('rien ne se dépense pendant que SumUp rembourse', async () => {
    await rechargeByCard(1000);
    let spent: unknown = null;
    sumup.state.onRefund = async () => {
      spent = await createSale(db, SECRET, { clientId: 'pendant', lines: [{ itemId: coffee.id, quantity: 1 }], prepaidScanToken: await scan(), expectedCashCents: 0, createdByEmail: BY })
        .catch((e) => e);
    };
    await refund();
    expect(spent).toBeInstanceOf(Error);
    expect(await balance()).toBe(0);
  });

  it('un rejeu ne rembourse pas deux fois', async () => {
    await rechargeByCard(1000);
    await refund('remb-rejeu-1');
    expect(await refund('remb-rejeu-1')).toMatchObject({ replayed: true, amountCents: 1000, cardRefunds: [{ amountCents: 1000 }] });
    expect(sumup.calls).toHaveLength(1);
  });

  it('un remboursement déjà commencé dans l\'application ne se refait pas : espèces', async () => {
    await rechargeByCard(1000);
    for (const p of sumup.payments.values()) p.refundedCents = 300;
    expect(await refund()).toMatchObject({ cashCents: 1000, cardRefunds: [] });
    expect(sumup.calls).toHaveLength(0);
  });

  it('sans réponse de SumUp, la part reste sur la CB ; le cron la signale, un bénévole la relance', async () => {
    await rechargeByCard(1000);
    sumup.state.answer = 'unknown';
    expect(await refund()).toMatchObject({ cashCents: 0, cardRefunds: [{ amountCents: 1000, status: 'pending' }] });
    await settlePendingRefunds(db, sumup.client, new Date(Date.now() + REFUND_GIVE_UP_MS + 1000));
    const [owed] = (await getCurrentSession(db))!.toRefund;
    expect(owed).toMatchObject({ kind: 'card_balance', amountCents: 1000, refundStatus: 'failed' });
    sumup.state.answer = 'done';
    expect(await refundCardPayment(db, sumup.client, { attemptId: owed.attemptId, requestedByEmail: BY })).toMatchObject({ status: 'done', amountCents: 1000 });
    expect(sumup.calls.map((c) => c.amountCents)).toEqual([1000, 1000]);
    expect((await getCurrentSession(db))!.toRefund).toEqual([]);
  });

  it('interrompu avant la fin, le remboursement reprend au scan suivant sans renvoyer à SumUp', async () => {
    await rechargeByCard(1000);
    const original = db.batch.bind(db);
    let calls = 0;
    db.batch = async (statements: any) => {
      calls++;
      if (calls === 2) throw new Error('Worker coupé');
      return original(statements);
    };
    await expect(refund('remb-coupe-1')).rejects.toThrow('Worker coupé');
    db.batch = original;
    expect((await db.select().from(buvetteCardsTable).where(eq(buvetteCardsTable.id, card.cardId)).get()).reservedCents).toBe(1000);
    expect(await refund('remb-coupe-2')).toMatchObject({ amountCents: 1000, cashCents: 0, cardRefunds: [{ amountCents: 1000, status: 'done' }] });
    expect(sumup.calls).toHaveLength(1);
    expect(await db.select().from(buvetteCardsTable).where(eq(buvetteCardsTable.id, card.cardId)).get()).toMatchObject({ balanceCents: 0, reservedCents: 0 });
  });

  it('une recharge dont le solde est revenu sur la CB ne s\'annule plus', async () => {
    const { sale, attempt } = await createSale(db, SECRET, {
      clientId: 'recharge-annulee', lines: [], rechargeCents: 3000, rechargeScanToken: await scan(), expectedCashCents: 3000, createdByEmail: BY, payRestByCard: true
    });
    sumup.payments.set(attempt!.foreignTxId, { amountCents: 3000, refundedCents: 0 });
    await verifyAttempt(db, async () => ({ status: 'successful', amountCents: 3000, currency: 'EUR', transactionCode: 'TAAA' }), attempt!.foreignTxId);
    await createSale(db, SECRET, { clientId: 'conso', lines: [{ itemId: coffee.id, quantity: 2 }], prepaidScanToken: await scan(), expectedCashCents: 0, createdByEmail: BY });
    await refund('remb-avant-annulation');
    await rechargeByCash(3000);
    await expect(cancelSale(db, { saleId: sale.id, cancelledByEmail: BY })).rejects.toThrow('ne peut plus être annulée');
  });

  it('une recharge déjà rendue sur la CB ne sert pas deux fois', async () => {
    await rechargeByCard(1000);
    await refund('remb-premier-1');
    await rechargeByCash(500);
    expect(await refund('remb-second-1')).toMatchObject({ cashCents: 500, cardRefunds: [] });
  });
});
