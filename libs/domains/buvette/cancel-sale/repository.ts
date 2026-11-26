import { and, eq, sql } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { buvetteCardAttemptsTable, buvetteCardMovementsTable, buvetteCardsTable, buvetteOrdersTable, buvetteSalesTable, buvetteSessionsTable } from '../shared/schema';

export class CancelSaleRepository {
  getSale(db: DbOrTx, id: number) {
    return db.select().from(buvetteSalesTable).where(eq(buvetteSalesTable.id, id)).get();
  }

  /** Le paiement CB qui a réglé la vente : la caisse le fait rembourser par SumUp. */
  async successfulAttemptId(db: DbOrTx, saleId: number): Promise<number | undefined> {
    const row = await db.select({ id: buvetteCardAttemptsTable.id }).from(buvetteCardAttemptsTable)
      .where(and(eq(buvetteCardAttemptsTable.saleId, saleId), eq(buvetteCardAttemptsTable.status, 'successful')))
      .get();
    return row?.id;
  }

  getCard(db: DbOrTx, id: number) {
    return db.select().from(buvetteCardsTable).where(eq(buvetteCardsTable.id, id)).get();
  }

  /** Une vente annulée remet la carte papier à vendre : elle n'a jamais servi. */
  buildResetPaperStatement(db: DbOrTx, cardId: number): any {
    return db.update(buvetteCardsTable).set({ paperStatus: 'new' })
      .where(and(eq(buvetteCardsTable.id, cardId), eq(buvetteCardsTable.kind, 'paper'), eq(buvetteCardsTable.balanceCents, 0)));
  }

  /**
   * La vente remboursée rend sa commande au client, comme une CB abandonnée : la caisse peut
   * l'encaisser de nouveau, une fois la carte rechargée. S'il en a repassé une entre-temps,
   * l'ancienne s'annule, l'index d'une commande en cours par carte l'exige.
   */
  buildReopenOrderStatement(db: DbOrTx, orderId: number): any {
    return db.update(buvetteOrdersTable)
      .set({
        status: sql`CASE WHEN EXISTS (SELECT 1 FROM buvette_orders o WHERE o.card_id = buvette_orders.card_id AND o.status = 'pending') THEN 'cancelled' ELSE 'pending' END` as any
      })
      .where(eq(buvetteOrdersTable.id, orderId));
  }

  getSession(db: DbOrTx, id: number) {
    return db.select().from(buvetteSessionsTable).where(eq(buvetteSessionsTable.id, id)).get();
  }

  buildCancelStatement(db: DbOrTx, id: number, by: string): any {
    return db.update(buvetteSalesTable)
      .set({ status: 'cancelled', cancelledByEmail: by, cancelledAt: new Date() })
      .where(and(
        eq(buvetteSalesTable.id, id),
        eq(buvetteSalesTable.status, 'paid'),
        sql`${buvetteSalesTable.sessionId} IN (SELECT ${buvetteSessionsTable.id} FROM ${buvetteSessionsTable} WHERE ${buvetteSessionsTable.status} = 'open')`
      ));
  }

  buildBalanceStatement(db: DbOrTx, cardId: number, deltaCents: number): any {
    return db.update(buvetteCardsTable)
      .set({ balanceCents: sql`${buvetteCardsTable.balanceCents} + ${deltaCents}` })
      .where(eq(buvetteCardsTable.id, cardId));
  }

  /** La session est relue dans l'instruction : clôturée entre-temps, le NOT NULL annule le lot. */
  buildMovementStatement(db: DbOrTx, sessionId: number, values: Omit<typeof buvetteCardMovementsTable.$inferInsert, 'sessionId'>): any {
    return db.insert(buvetteCardMovementsTable).values({
      ...values,
      sessionId: sql`(SELECT ${buvetteSessionsTable.id} FROM ${buvetteSessionsTable} WHERE ${buvetteSessionsTable.id} = ${sessionId} AND ${buvetteSessionsTable.status} = 'open')` as any
    });
  }
}
