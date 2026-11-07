import { type Db } from '@nba/db';
import { cardLabel, getOpenSession, isCardGone } from '../shared/queries.repository';
import { ListSessionSalesRepository } from './repository';
import type { SessionEntry, SessionSale } from './dto';

const MAX_SALES = 50;

/**
 * Les dernières ventes de la session ouverte, pour corriger une erreur à la caisse, avec les
 * soldes de carte rendus en espèces : ils sortent de la caisse, le bénévole doit les retrouver.
 */
export async function listSessionSales(db: Db): Promise<SessionEntry[]> {
  const session = await getOpenSession(db);
  if (!session) return [];
  const repo = new ListSessionSalesRepository();
  const [sales, refunds] = await Promise.all([repo.sales(db, session.id, MAX_SALES), repo.cardRefunds(db, session.id, MAX_SALES)]);
  if (sales.length === 0 && refunds.length === 0) return [];
  const saleIds = sales.map((s) => s.id);
  const lines = saleIds.length ? await repo.lines(db, saleIds) : [];
  const cardIds = [...new Set([...sales.flatMap((s) => (s.prepaidCardId ? [s.prepaidCardId] : [])), ...refunds.map((r) => r.cardId)])];
  const cards = cardIds.length ? await repo.cards(db, cardIds) : [];
  const payments = saleIds.length ? await repo.cardPayments(db, saleIds) : [];
  const entries: SessionEntry[] = refunds.map((refund) => {
    const card = cards.find((c) => c.id === refund.cardId);
    return { kind: 'card_refund', id: refund.id, createdAt: refund.createdAt, amountCents: -refund.amountCents, cardLabel: card ? cardLabel(card) : 'Carte supprimée' };
  });
  return [...entries, ...sales.map((sale): SessionSale => {
    const card = cards.find((c) => c.id === sale.prepaidCardId);
    const payment = payments.find((p) => p.saleId === sale.id);
    return {
    kind: 'sale',
    id: sale.id,
    status: sale.status,
    createdAt: sale.createdAt,
    itemsCents: sale.itemsCents,
    rechargeCents: sale.rechargeCents,
    prepaidCents: sale.prepaidCents,
    cashCents: sale.cashCents,
    cardCents: sale.cardCents,
    prepaidCardLabel: card && !isCardGone(card) ? cardLabel(card) : null,
    prepaidCardDeleted: Boolean(card && isCardGone(card)),
    transactionCode: payment?.transactionCode ?? null,
    cardAttemptId: payment?.attemptId ?? null,
    cardRefundStatus: payment?.refundStatus ?? null,
    lines: lines.filter((l) => l.saleId === sale.id).map(({ name, quantity, unitPriceCents }) => ({ name, quantity, unitPriceCents }))
    };
  })].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, MAX_SALES);
}
