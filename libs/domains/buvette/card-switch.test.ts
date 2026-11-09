import { beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { setupMockDb } from '@nba/db/test-utils';
import { categoriesTable, seasonsTable } from '@nba/accounting/schema';
import { signCardToken } from './shared/card-tokens';
import type { SumUpRefunds } from './shared/sumup-refunds';
import type { SumUpLookup } from './shared/sumup';
import { createItem } from './manage-items/handler';
import { openSession } from './open-session/handler';
import { getCurrentSession } from './get-current-session/handler';
import { openCard } from './open-card/handler';
import { scanCard } from './scan-card/handler';
import { createSale } from './create-sale/handler';
import { cancelSale } from './cancel-sale/handler';
import { refundCard } from './refund-card/handler';
import { readCardPayments, setCardPayments } from './manage-settings/handler';
import { retryAttempt, verifyAttempt } from './verify-card-attempt/handler';
import { refundCardPayment } from './refund-card-payment/handler';

const SECRET = 'secret-de-test';
const BY = 'benevole@example.org';
const paid: SumUpLookup = async () => ({ status: 'successful', amountCents: 2000, currency: 'EUR', transactionCode: 'TAAA' });

/** Un faux SumUp qui rembourse tout, et compte les demandes reçues. */
function fakeSumUp() {
  const calls: number[] = [];
  const client: SumUpRefunds = {
    async find(id) { return { id, amountCents: 2000, refundedCents: calls.reduce((a, b) => a + b, 0) }; },
    async refund(_id, amountCents) { calls.push(amountCents); return { outcome: 'done' }; }
  };
  return { client, calls };
}

describe('interrupteur d\'urgence de la CB', () => {
  let db: any;
  let coffee: { id: number };
  let card: { cardId: number; deviceId: string };

  const scan = async () => (await signCardToken(SECRET, 'scan', card.cardId, card.deviceId)).token;
  const sellByCard = async (clientId: string, values: Record<string, unknown> = {}) => createSale(db, SECRET, {
    clientId, lines: [{ itemId: coffee.id, quantity: 4 }], expectedCashCents: 2000, createdByEmail: BY, payRestByCard: true, ...values
  });

  beforeEach(async () => {
    db = (await setupMockDb()).db;
    await db.insert(seasonsTable).values({
      code: '25-26', name: 'Saison 2025-2026', startDate: '2025-09-01', endDate: '2026-08-31', active: true, closedAt: null, createdAt: new Date()
    });
    const category = await db.select().from(categoriesTable).where(eq(categoriesTable.adminLabel, 'Buvettes')).get();
    coffee = await createItem(db, { name: 'Café', priceCents: 500 });
    await openSession(db, { openingFloatCents: 5000, accountingCategoryId: category.id, openedByEmail: BY });
    card = await openCard(db, 'client@example.org');
  });

  it('la CB est permise par défaut, et l\'interrupteur se lit et se rétablit', async () => {
    expect(await readCardPayments(db)).toEqual({ cardPaymentsEnabled: true });
    expect(await setCardPayments(db, false)).toEqual({ cardPaymentsEnabled: false });
    expect((await getCurrentSession(db))!.cardPaymentsEnabled).toBe(false);
    expect(await setCardPayments(db, true)).toEqual({ cardPaymentsEnabled: true });
    expect((await getCurrentSession(db))!.cardPaymentsEnabled).toBe(true);
  });

  it('coupée, la CB est refusée mais les espèces passent', async () => {
    await setCardPayments(db, false);
    await expect(sellByCard('vente-cb')).rejects.toThrow('CB est suspendue');
    const { sale } = await createSale(db, SECRET, { clientId: 'vente-especes', lines: [{ itemId: coffee.id, quantity: 1 }], expectedCashCents: 500, createdByEmail: BY });
    expect(sale.status).toBe('paid');
  });

  it('coupée pendant une vente, la CB ne se relance plus : la vente s\'abandonne', async () => {
    const { sale } = await sellByCard('vente-cb');
    await setCardPayments(db, false);
    await expect(retryAttempt(db, async () => ({ status: 'failed' }) as any, sale.id)).rejects.toThrow('abandonnez la vente');
  });

  it('coupée, le solde d\'une carte chargée par CB se rend tout en espèces, sans appel à SumUp', async () => {
    const { attempt } = await createSale(db, SECRET, {
      clientId: 'recharge-cb', lines: [], rechargeCents: 2000, rechargeScanToken: await scan(), expectedCashCents: 2000, createdByEmail: BY, payRestByCard: true
    });
    await verifyAttempt(db, paid, attempt!.foreignTxId);
    await setCardPayments(db, false);

    const qr = (await signCardToken(SECRET, 'qr', card.cardId, card.deviceId)).token;
    expect((await scanCard(db, SECRET, qr)).cbRefundableCents).toBe(0);
    const sumup = fakeSumUp();
    const result = await refundCard(db, SECRET, { clientId: 'remb-1', scanToken: await scan(), createdByEmail: BY }, sumup.client);
    expect(result).toMatchObject({ amountCents: 2000, cashCents: 2000, cardRefunds: [] });
    expect(sumup.calls).toEqual([]);
  });

  it('coupée, une vente CB remboursée reste à rembourser, et part au rétablissement', async () => {
    const { sale, attempt } = await sellByCard('vente-cb');
    await verifyAttempt(db, paid, attempt!.foreignTxId);
    const cancelled = await cancelSale(db, { saleId: sale.id, cancelledByEmail: BY });
    await setCardPayments(db, false);

    const sumup = fakeSumUp();
    const input = { attemptId: cancelled.cardAttemptId!, requestedByEmail: BY };
    await expect(refundCardPayment(db, sumup.client, input)).rejects.toThrow('attendra son rétablissement');
    expect(sumup.calls).toEqual([]);

    await setCardPayments(db, true);
    expect(await refundCardPayment(db, sumup.client, input)).toMatchObject({ status: 'done', amountCents: 2000 });
  });

  it('coupée entre le contrôle et l\'envoi, rien ne part vers SumUp', async () => {
    const { sale, attempt } = await sellByCard('vente-cb');
    await verifyAttempt(db, paid, attempt!.foreignTxId);
    const cancelled = await cancelSale(db, { saleId: sale.id, cancelledByEmail: BY });
    const sumup = fakeSumUp();
    const find = sumup.client.find;
    // Le bureau coupe pendant que la caisse relit la transaction, juste avant l'envoi.
    sumup.client.find = async (id) => { await setCardPayments(db, false); return find(id); };

    const result = await refundCardPayment(db, sumup.client, { attemptId: cancelled.cardAttemptId!, requestedByEmail: BY });
    expect(result.status).toBe('pending');
    expect(sumup.calls).toEqual([]);
  });
});
