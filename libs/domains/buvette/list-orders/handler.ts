import { AppError, type Db } from '@nba/db';
import { availableCents, getOpenSession } from '../shared/queries.repository';
import { maskEmail } from '../shared/mask';
import { ListOrdersRepository } from './repository';
import type { PendingOrder } from './dto';

const MAX_ORDERS = 30;

const MIN_EMAIL_PREFIX = 3;

/**
 * Un numéro cherche la commande, le reste le début de l'adresse, à partir de trois caractères :
 * assez pour retrouver un client qui la dicte, sans pouvoir la deviner lettre par lettre depuis
 * n'importe où. Les jokers SQL sont neutralisés. `null` : une recherche trop courte, sans résultat.
 */
export function readSearch(raw: string | undefined): { id: number | null; email: string | null } | null {
  const term = raw?.trim().replace(/^n[°o]?\s*(?=\d)/i, '') ?? '';
  if (!term) return { id: null, email: null };
  if (/^\d+$/.test(term)) return { id: Number(term), email: null };
  if (term.length < MIN_EMAIL_PREFIX) return null;
  return { id: null, email: term.toLowerCase().replace(/[\\%_]/g, '\\$&') };
}

export async function listPendingOrders(db: Db, search?: string): Promise<PendingOrder[]> {
  const session = await getOpenSession(db);
  if (!session) return [];
  const criteria = readSearch(search);
  if (!criteria) return [];
  const repo = new ListOrdersRepository();
  const orders = await repo.pending(db, session.openedAt, criteria, MAX_ORDERS);
  if (orders.length === 0) return [];
  const lines = await repo.lines(db, orders.map((o) => o.id));
  return orders.map((order) => {
    const own = lines.filter((l) => l.orderId === order.id);
    return {
      id: order.id,
      createdAt: order.createdAt,
      label: maskEmail(order.email),
      availableCents: availableCents(order),
      totalCents: own.reduce((sum, l) => sum + l.quantity * l.unitPriceCents, 0),
      lines: own.map(({ name, quantity, unitPriceCents, available }) => ({ name, quantity, unitPriceCents, available }))
    };
  });
}

export async function getPendingOrder(db: Db, id: number): Promise<PendingOrder> {
  const [order] = await listPendingOrders(db, String(id));
  if (!order) throw new AppError('Cette commande n\'est plus en cours.', 404);
  return order;
}
