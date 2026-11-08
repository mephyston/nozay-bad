import { AppError, type Db } from '@nba/db';
import { SessionHistoryRepository } from './repository';
import type { ItemReportLine, SessionReport, SessionSummary } from './dto';

const repo = new SessionHistoryRepository();
const MAX_SESSIONS = 100;

async function summaries(db: Db, sessionId?: number): Promise<SessionSummary[]> {
  const sessions = await repo.sessions(db, MAX_SESSIONS, sessionId);
  if (sessions.length === 0) return [];
  const ids = sessions.map((s) => s.id);
  const [sales, refunds] = await Promise.all([repo.salesTotals(db, ids), repo.refundTotals(db, ids)]);
  return sessions.map((session) => {
    const s = sales.find((t) => t.sessionId === session.id);
    const r = refunds.find((t) => t.sessionId === session.id);
    return {
      ...session,
      salesCount: Number(s?.salesCount ?? 0),
      itemsCents: Number(s?.itemsCents ?? 0),
      rechargeCents: Number(s?.rechargeCents ?? 0),
      cashCents: Number(s?.cashCents ?? 0),
      cardCents: Number(s?.cardCents ?? 0),
      prepaidCents: Number(s?.prepaidCents ?? 0),
      refundsCashCents: Number(r?.cash ?? 0),
      refundsCardCents: Number(r?.card ?? 0)
    };
  });
}

const toItems = (rows: { name: string; quantity: number; amountCents: number }[]): ItemReportLine[] =>
  rows.map((r) => ({ name: r.name, quantity: Number(r.quantity), amountCents: Number(r.amountCents) }));

/** L'historique des sessions, la plus récente d'abord, et les ventes par article sur toutes. */
export async function listSessionHistory(db: Db): Promise<{ sessions: SessionSummary[]; items: ItemReportLine[] }> {
  const [sessions, items] = await Promise.all([summaries(db), repo.itemsReport(db)]);
  return { sessions, items: toItems(items) };
}

/** Le détail d'une session : chaque vente, les soldes rendus, et les ventes par article. */
export async function getSessionReport(db: Db, sessionId: number): Promise<SessionReport> {
  const [session] = await summaries(db, sessionId);
  if (!session) throw new AppError('Session introuvable.', 404);
  const [sales, cardRefunds, items] = await Promise.all([repo.sales(db, sessionId), repo.cardRefunds(db, sessionId), repo.itemsReport(db, sessionId)]);
  const lines = sales.length ? await repo.lines(db, sales.map((s) => s.id)) : [];
  return {
    session,
    sales: sales.map((sale) => ({
      ...sale,
      lines: lines.filter((l) => l.saleId === sale.id).map(({ name, quantity, unitPriceCents }) => ({ name, quantity, unitPriceCents }))
    })),
    cardRefunds: cardRefunds.map((r) => ({ id: r.id, createdAt: r.createdAt, amountCents: -r.amountCents, byCard: r.sumupAttemptId !== null, createdByEmail: r.createdByEmail })),
    items: toItems(items)
  };
}
