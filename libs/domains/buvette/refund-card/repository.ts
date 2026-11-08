import { eq, like, or, sql } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { buvetteCardMovementsTable, buvetteCardsTable, buvetteSessionsTable } from '../shared/schema';

export class RefundCardRepository {
  /** Les mouvements d'un remboursement : la part espèces et les parts rendues sur CB. */
  findMovements(db: DbOrTx, clientId: string) {
    return db.select().from(buvetteCardMovementsTable)
      .where(or(eq(buvetteCardMovementsTable.clientId, clientId), like(buvetteCardMovementsTable.clientId, `${clientId}-cb-%`)))
      .all();
  }

  /** Bloque le solde le temps que SumUp rembourse : rien ne peut le dépenser entre-temps. */
  buildReserveStatement(db: DbOrTx, cardId: number, amountCents: number): any {
    return db.update(buvetteCardsTable)
      .set({ reservedCents: sql`${buvetteCardsTable.reservedCents} + ${amountCents}` })
      .where(eq(buvetteCardsTable.id, cardId));
  }

  /** Retire le montant réservé, et la réservation avec. */
  buildDebitReservedStatement(db: DbOrTx, cardId: number, amountCents: number): any {
    return db.update(buvetteCardsTable)
      .set({ balanceCents: sql`${buvetteCardsTable.balanceCents} - ${amountCents}`, reservedCents: sql`${buvetteCardsTable.reservedCents} - ${amountCents}` })
      .where(eq(buvetteCardsTable.id, cardId));
  }

  /**
   * Retire le montant lu, sans mettre le solde à zéro : une recharge arrivée entre la lecture
   * et le lot reste sur la carte, et le mouvement dit exactement ce qui a été rendu. Le CHECK
   * du solde annule le lot si le montant n'y est plus.
   */
  buildDebitStatement(db: DbOrTx, cardId: number, amountCents: number): any {
    return db.update(buvetteCardsTable)
      .set({ balanceCents: sql`${buvetteCardsTable.balanceCents} - ${amountCents}` })
      .where(eq(buvetteCardsTable.id, cardId));
  }

  buildClosePaperStatement(db: DbOrTx, cardId: number): any {
    return db.update(buvetteCardsTable).set({ paperStatus: 'closed', paperClosedReason: 'refunded' }).where(eq(buvetteCardsTable.id, cardId));
  }

  /** La session est relue dans l'instruction : clôturée entre-temps, le NOT NULL annule le lot. */
  buildMovementStatement(db: DbOrTx, sessionId: number, values: Omit<typeof buvetteCardMovementsTable.$inferInsert, 'sessionId'>): any {
    return db.insert(buvetteCardMovementsTable).values({
      ...values,
      sessionId: sql`(SELECT ${buvetteSessionsTable.id} FROM ${buvetteSessionsTable} WHERE ${buvetteSessionsTable.id} = ${sessionId} AND ${buvetteSessionsTable.status} = 'open')` as any
    });
  }
}
