import { beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { setupMockDb } from '@nba/db/test-utils';
import { categoriesTable, seasonsTable } from '@nba/accounting/schema';
import { buvetteSumUpRefundsTable } from './shared/schema';
import type { SumUpLookup } from './shared/sumup';
import type { SumUpPayment, SumUpRefundOutcome, SumUpRefunds } from './shared/sumup-refunds';
import { readPayment } from './shared/sumup-refunds';
import { createItem } from './manage-items/handler';
import { openSession } from './open-session/handler';
import { getCurrentSession } from './get-current-session/handler';
import { createSale } from './create-sale/handler';
import { cancelSale } from './cancel-sale/handler';
import { abandonSale, verifyAttempt } from './verify-card-attempt/handler';
import { refundCardPayment, settlePendingRefunds, REFUND_GIVE_UP_MS, REFUND_SETTLE_MS } from './refund-card-payment/handler';

const SECRET = 'secret-de-test';
const BY = 'benevole@example.org';
const paid: SumUpLookup = async () => ({ status: 'successful', amountCents: 400, currency: 'EUR', transactionCode: 'TAAA' });

/** Un faux SumUp : il garde ce qui a été remboursé, et compte les demandes reçues. */
function fakeSumUp(answer: SumUpRefundOutcome['outcome'] = 'done') {
  const state = { refundedCents: 0, calls: 0 };
  const client: SumUpRefunds = {
    async find(): Promise<SumUpPayment> {
      return { id: 'tx-1', amountCents: 400, refundedCents: state.refundedCents };
    },
    async refund(_id, amountCents) {
      state.calls++;
      if (answer === 'done') state.refundedCents += amountCents;
      return answer === 'refused' ? { outcome: 'refused', message: 'Solde insuffisant' } : { outcome: answer } as SumUpRefundOutcome;
    }
  };
  return { client, state };
}

describe('remboursement d\'une CB par SumUp', () => {
  let db: any;
  let sandwich: { id: number };

  async function paidByCard() {
    const { sale, attempt } = await createSale(db, SECRET, {
      clientId: `cb-${Math.random()}`, lines: [{ itemId: sandwich.id, quantity: 1 }], expectedCashCents: 400, createdByEmail: BY, payRestByCard: true
    });
    await verifyAttempt(db, paid, attempt!.foreignTxId);
    return sale;
  }

  beforeEach(async () => {
    db = (await setupMockDb()).db;
    await db.insert(seasonsTable).values({
      code: '25-26', name: 'Saison 2025-2026', startDate: '2025-09-01', endDate: '2026-08-31', active: true, closedAt: null, createdAt: new Date()
    });
    const category = await db.select().from(categoriesTable).where(eq(categoriesTable.adminLabel, 'Buvettes')).get();
    sandwich = await createItem(db, { name: 'Sandwich', priceCents: 400 });
    await openSession(db, { openingFloatCents: 5000, accountingCategoryId: category.id, openedByEmail: BY });
  });

  it('rembourse la part CB d\'une vente remboursée, une seule fois', async () => {
    const sale = await paidByCard();
    const cancelled = await cancelSale(db, { saleId: sale.id, cancelledByEmail: BY });
    const sumup = fakeSumUp();
    const input = { attemptId: cancelled.cardAttemptId!, requestedByEmail: BY };
    expect(await refundCardPayment(db, sumup.client, input)).toMatchObject({ status: 'done', amountCents: 400 });
    expect(await refundCardPayment(db, sumup.client, input)).toMatchObject({ status: 'done' });
    expect(sumup.state.calls).toBe(1);
  });

  it('une vente encore payée ne se rembourse pas par ce chemin', async () => {
    const sale = await paidByCard();
    const attemptId = (await cancelSaleAttempt(sale.id));
    await expect(refundCardPayment(db, fakeSumUp().client, { attemptId, requestedByEmail: BY })).rejects.toThrow("n'est pas à rembourser");
  });

  it('un remboursement déjà fait dans l\'application est constaté, sans second envoi', async () => {
    const sale = await paidByCard();
    const { cardAttemptId } = await cancelSale(db, { saleId: sale.id, cancelledByEmail: BY });
    const sumup = fakeSumUp();
    sumup.state.refundedCents = 400;
    expect(await refundCardPayment(db, sumup.client, { attemptId: cardAttemptId!, requestedByEmail: BY })).toMatchObject({ status: 'done' });
    expect(sumup.state.calls).toBe(0);
  });

  it('une réponse perdue ne renvoie rien : la demande attend, puis le cron la relit', async () => {
    const sale = await paidByCard();
    const { cardAttemptId } = await cancelSale(db, { saleId: sale.id, cancelledByEmail: BY });
    const sumup = fakeSumUp('unknown');
    const input = { attemptId: cardAttemptId!, requestedByEmail: BY };
    expect(await refundCardPayment(db, sumup.client, input)).toMatchObject({ status: 'pending' });
    expect(await refundCardPayment(db, sumup.client, input)).toMatchObject({ status: 'pending' });
    expect(sumup.state.calls).toBe(1);
    // Rien encore chez SumUp : le cron attend, il ne déclare pas l'échec trop tôt.
    await settlePendingRefunds(db, sumup.client, new Date(Date.now() + REFUND_SETTLE_MS + 1000));
    expect(await db.select().from(buvetteSumUpRefundsTable).get()).toMatchObject({ status: 'pending' });
    // SumUp l'a bien passé : le cron le constate.
    sumup.state.refundedCents = 400;
    await settlePendingRefunds(db, sumup.client, new Date(Date.now() + REFUND_SETTLE_MS + 1000));
    const row = await db.select().from(buvetteSumUpRefundsTable).get();
    expect(row).toMatchObject({ status: 'done', amountCents: 400 });
  });

  it('sans remboursement visible au bout de 30 minutes, le cron passe en échec', async () => {
    const sale = await paidByCard();
    const { cardAttemptId } = await cancelSale(db, { saleId: sale.id, cancelledByEmail: BY });
    const sumup = fakeSumUp('unknown');
    await refundCardPayment(db, sumup.client, { attemptId: cardAttemptId!, requestedByEmail: BY });
    await settlePendingRefunds(db, sumup.client, new Date(Date.now() + REFUND_GIVE_UP_MS + 1000));
    expect(await db.select().from(buvetteSumUpRefundsTable).get()).toMatchObject({ status: 'failed' });
    expect(sumup.state.calls).toBe(1);
  });

  it('un refus de SumUp se dit, et se relance à la main', async () => {
    const sale = await paidByCard();
    const { cardAttemptId } = await cancelSale(db, { saleId: sale.id, cancelledByEmail: BY });
    const input = { attemptId: cardAttemptId!, requestedByEmail: BY };
    expect(await refundCardPayment(db, fakeSumUp('refused').client, input)).toMatchObject({ status: 'failed', error: 'Solde insuffisant' });
    expect(await refundCardPayment(db, fakeSumUp('done').client, input)).toMatchObject({ status: 'done' });
  });

  it('un paiement arrivé après l\'abandon se rembourse, et quitte la liste à rembourser', async () => {
    const { sale, attempt } = await createSale(db, SECRET, {
      clientId: 'tardive', lines: [{ itemId: sandwich.id, quantity: 1 }], expectedCashCents: 400, createdByEmail: BY, payRestByCard: true
    });
    await abandonSale(db, async () => ({ status: 'unknown' }), sale.id, BY);
    await verifyAttempt(db, paid, attempt!.foreignTxId);
    const [stray] = (await getCurrentSession(db))!.toRefund;
    expect(stray).toMatchObject({ amountCents: 400, anomaly: 'late', refundStatus: null });
    await refundCardPayment(db, fakeSumUp().client, { attemptId: stray.attemptId, requestedByEmail: BY });
    expect((await getCurrentSession(db))!.toRefund).toEqual([]);
  });

  it('lit les remboursements d\'une transaction SumUp', () => {
    expect(readPayment({ id: 'x', amount: 7, events: [
      { type: 'PAYOUT', status: 'SCHEDULED', amount: 6.88 },
      { type: 'REFUND', status: 'REFUNDED', amount: 2 },
      { type: 'REFUND', status: 'FAILED', amount: 5 },
      { type: 'REFUND', status: 'REFUNDED', amount: 1 }
    ] })).toEqual({ id: 'x', amountCents: 700, refundedCents: 300 });
  });

  async function cancelSaleAttempt(saleId: number): Promise<number> {
    const { buvetteCardAttemptsTable } = await import('./shared/schema');
    return (await db.select().from(buvetteCardAttemptsTable).where(eq(buvetteCardAttemptsTable.saleId, saleId)).get()).id;
  }
});
