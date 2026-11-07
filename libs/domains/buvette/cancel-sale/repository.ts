import { and, eq, sql } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { buvetteCardMovementsTable, buvetteCardsTable, buvetteSalesTable, buvetteSessionsTable } from '../shared/schema';

export class CancelSaleRepository {
  getSale(db: DbOrTx, id: number) {
    return db.select().from(buvetteSalesTable).where(eq(buvetteSalesTable.id, id)).get();
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
