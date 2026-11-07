import { AppError, type Db } from '@nba/db';
import { getActiveDevice, getOpenSession } from '../shared/queries.repository';
import { ClientOrderRepository } from './repository';
import type { CatalogForClient, ClientOrder } from './dto';

const repo = new ClientOrderRepository();

async function assertDevice(db: Db, cardId: number, deviceId: string) {
  if (!(await getActiveDevice(db, cardId, deviceId))) throw new AppError('Cet appareil a été déconnecté de la carte.', 401);
}

/** Un article retiré de la vente disparaît ici : c'est ainsi qu'une rupture se traduit. */
export async function getCatalog(db: Db): Promise<CatalogForClient> {
  const [session, items] = await Promise.all([getOpenSession(db), repo.activeItems(db)]);
  return { open: Boolean(session), items };
}

export async function getCurrentOrder(db: Db, cardId: number, deviceId: string): Promise<ClientOrder | null> {
  await assertDevice(db, cardId, deviceId);
  const order = await repo.pending(db, cardId);
  // Une commande d'un service passé n'existe plus pour le client : il en repasse une.
  if (!order || order.sessionId !== (await getOpenSession(db))?.id) return null;
  const lines = await repo.lines(db, order.id);
  return {
    id: order.id,
    number: order.number,
    createdAt: order.createdAt,
    totalCents: lines.reduce((sum, l) => sum + l.quantity * l.unitPriceCents, 0),
    lines
  };
}

/**
 * Crée la commande de la carte, ou la modifie : elle garde alors son numéro, que le client a
 * peut-être déjà donné. Rien n'est réservé : la caisse encaisse au comptoir.
 */
export async function createOrder(db: Db, cardId: number, deviceId: string, lines: { itemId: number; quantity: number }[]) {
  await assertDevice(db, cardId, deviceId);
  const session = await getOpenSession(db);
  if (!session) throw new AppError('La buvette est fermée : revenez à son ouverture.', 409);
  const items = await repo.activeItems(db);
  for (const line of lines) {
    if (!items.some((i) => i.id === line.itemId)) throw new AppError("Un article de votre panier n'est plus disponible.", 409);
  }
  const existing = await repo.pending(db, cardId);
  await db.batch([
    ...(existing?.sessionId === session.id
      ? [repo.buildClearLinesStatement(db, cardId)]
      : [repo.buildCancelPendingStatement(db, cardId), repo.buildCreateStatement(db, cardId, session.id)]),
    ...lines.map((l) => repo.buildLineStatement(db, cardId, l.itemId, l.quantity))
  ] as any);
  return getCurrentOrder(db, cardId, deviceId);
}

export async function cancelOrder(db: Db, cardId: number, deviceId: string): Promise<void> {
  await assertDevice(db, cardId, deviceId);
  await db.batch([repo.buildCancelPendingStatement(db, cardId)] as any);
}
