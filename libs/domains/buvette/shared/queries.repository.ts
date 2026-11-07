import { and, eq, sql } from 'drizzle-orm';
import { AppError, type DbOrTx } from '@nba/db';
import { maskEmail } from './mask';
import { closedPaperMessage, paperLabel, PAPER_DEVICE } from './paper-card';
import {
  buvetteCardDevicesTable,
  buvetteCardMovementsTable,
  buvetteCardsTable,
  buvetteOrdersTable,
  buvetteSalesTable,
  buvetteSessionsTable,
  buvetteSettingsTable
} from './schema';

/** Les lectures que plusieurs tranches du domaine partagent. */
export function getSettings(db: DbOrTx) {
  return db.select().from(buvetteSettingsTable).where(eq(buvetteSettingsTable.id, 1)).get();
}

export function getOpenSession(db: DbOrTx) {
  return db.select().from(buvetteSessionsTable).where(eq(buvetteSessionsTable.status, 'open')).get();
}

/** Ce que la carte peut encore payer : son solde, moins ce qu'une vente en cours a réservé. */
export function availableCents(card: { balanceCents: number; reservedCents: number }): number {
  return card.balanceCents - card.reservedCents;
}

/** Ce que le club doit à ses clients : la somme des soldes, cartes supprimées exclues d'office à 0. */
export async function getCardsDebtCents(db: DbOrTx): Promise<number> {
  const row = await db.select({ total: sql<number>`COALESCE(SUM(${buvetteCardsTable.balanceCents}), 0)` }).from(buvetteCardsTable).get();
  return Number(row?.total ?? 0);
}

/** Celle du service en cours : une commande d'un service passé ne s'encaisse plus. */
export async function getPendingOrderId(db: DbOrTx, cardId: number): Promise<number | null> {
  const session = await getOpenSession(db);
  if (!session) return null;
  const row = await db.select({ id: buvetteOrdersTable.id }).from(buvetteOrdersTable)
    .where(and(eq(buvetteOrdersTable.cardId, cardId), eq(buvetteOrdersTable.status, 'pending'), eq(buvetteOrdersTable.sessionId, session.id)))
    .get();
  return row?.id ?? null;
}

export function getCard(db: DbOrTx, id: number) {
  return db.select().from(buvetteCardsTable).where(eq(buvetteCardsTable.id, id)).get();
}

export function getActiveDevice(db: DbOrTx, cardId: number, deviceId: string) {
  return db.select().from(buvetteCardDevicesTable).where(and(
    eq(buvetteCardDevicesTable.id, deviceId),
    eq(buvetteCardDevicesTable.cardId, cardId),
    sql`${buvetteCardDevicesTable.revokedAt} IS NULL`
  )).get();
}

/**
 * Le contrôle d'un jeton de scan. Une carte papier n'a pas d'appareil : c'est son état qui décide,
 * et une carte fermée le dit clairement, pour qu'on ne la rembourse pas une seconde fois.
 */
export async function assertScannedCardUsable(db: DbOrTx, cardId: number, deviceId: string): Promise<void> {
  if (deviceId === PAPER_DEVICE) {
    const card = await getCard(db, cardId);
    if (card?.paperStatus === 'closed') throw new AppError(closedPaperMessage(card.paperClosedReason), 409);
    return;
  }
  if (!(await getActiveDevice(db, cardId, deviceId))) throw new AppError('Cet appareil a été déconnecté de la carte.', 400);
}

/** Plus personne ne peut dépenser sur cette carte : ce qui lui revient se rend en espèces. */
export function isCardGone(card: { deletedAt: unknown; paperStatus: string | null }): boolean {
  return Boolean(card.deletedAt) || card.paperStatus === 'closed';
}

/** Ce que le bénévole lit : l'adresse masquée, ou le numéro d'une carte papier. */
export function cardLabel(card: { id: number; email: string | null }): string {
  return card.email ? maskEmail(card.email) : paperLabel(card.id);
}

/** Fond de caisse, plus les espèces des ventes payées, moins les remboursements en espèces. */
export async function getExpectedCashCents(db: DbOrTx, sessionId: number, openingFloatCents: number): Promise<number> {
  const sales = await db
    .select({ total: sql<number>`COALESCE(SUM(${buvetteSalesTable.cashCents}), 0)` })
    .from(buvetteSalesTable)
    .where(and(eq(buvetteSalesTable.sessionId, sessionId), eq(buvetteSalesTable.status, 'paid')))
    .get();
  const refunds = await db
    .select({ total: sql<number>`COALESCE(SUM(-${buvetteCardMovementsTable.amountCents}), 0)` })
    .from(buvetteCardMovementsTable)
    .where(and(eq(buvetteCardMovementsTable.sessionId, sessionId), eq(buvetteCardMovementsTable.type, 'refund')))
    .get();
  return openingFloatCents + Number(sales?.total ?? 0) - Number(refunds?.total ?? 0);
}
