import { and, eq, sql } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import {
  buvetteCardDevicesTable,
  buvetteCardMovementsTable,
  buvetteCardsTable,
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
