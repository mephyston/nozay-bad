import { type Db } from '@nba/db';
import { getOpenSession } from '../shared/queries.repository';
import { ListSessionSalesRepository } from './repository';
import type { SessionSale } from './dto';

const MAX_SALES = 50;

/** Les dernières ventes de la session ouverte, pour corriger une erreur à la caisse. */
export async function listSessionSales(db: Db): Promise<SessionSale[]> {
  const session = await getOpenSession(db);
  if (!session) return [];
  const repo = new ListSessionSalesRepository();
  const sales = await repo.sales(db, session.id, MAX_SALES);
  if (sales.length === 0) return [];
  const lines = await repo.lines(db, sales.map((s) => s.id));
  return sales.map((sale) => ({
    id: sale.id,
    status: sale.status,
    createdAt: sale.createdAt,
    itemsCents: sale.itemsCents,
    rechargeCents: sale.rechargeCents,
    prepaidCents: sale.prepaidCents,
    cashCents: sale.cashCents,
    cardCents: sale.cardCents,
    lines: lines.filter((l) => l.saleId === sale.id).map(({ name, quantity, unitPriceCents }) => ({ name, quantity, unitPriceCents }))
  }));
}
