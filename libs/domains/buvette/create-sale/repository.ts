import { eq, inArray, sql } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import {
  buvetteCardMovementsTable,
  buvetteCardsTable,
  buvetteItemsTable,
  buvetteSaleLinesTable,
  buvetteSalesTable,
  buvetteSessionsTable
} from '../shared/schema';

const saleIdOf = (clientId: string) =>
  sql`(SELECT ${buvetteSalesTable.id} FROM ${buvetteSalesTable} WHERE ${buvetteSalesTable.clientId} = ${clientId})` as any;

export class CreateSaleRepository {
  findByClientId(db: DbOrTx, clientId: string) {
    return db.select().from(buvetteSalesTable).where(eq(buvetteSalesTable.clientId, clientId)).get();
  }

  items(db: DbOrTx, ids: number[]) {
    return db.select().from(buvetteItemsTable).where(inArray(buvetteItemsTable.id, ids)).all();
  }

  /**
   * La session est relue dans l'instruction : si elle vient d'être clôturée, la sous-requête
   * rend NULL, la contrainte NOT NULL échoue et le lot entier est annulé.
   */
  buildSaleStatement(db: DbOrTx, sessionId: number, values: Omit<typeof buvetteSalesTable.$inferInsert, 'sessionId'>): any {
    return db.insert(buvetteSalesTable).values({
      ...values,
      sessionId: sql`(SELECT ${buvetteSessionsTable.id} FROM ${buvetteSessionsTable} WHERE ${buvetteSessionsTable.id} = ${sessionId} AND ${buvetteSessionsTable.status} = 'open')` as any
    });
  }

  buildLineStatement(db: DbOrTx, clientId: string, values: Omit<typeof buvetteSaleLinesTable.$inferInsert, 'saleId'>): any {
    return db.insert(buvetteSaleLinesTable).values({ ...values, saleId: saleIdOf(clientId) });
  }

  /** Le CHECK du solde annule le lot si le débit dépasse ce qui reste sur la carte. */
  buildBalanceStatement(db: DbOrTx, cardId: number, deltaCents: number): any {
    return db.update(buvetteCardsTable)
      .set({ balanceCents: sql`${buvetteCardsTable.balanceCents} + ${deltaCents}` })
      .where(eq(buvetteCardsTable.id, cardId));
  }

  buildMovementStatement(db: DbOrTx, saleClientId: string, values: Omit<typeof buvetteCardMovementsTable.$inferInsert, 'saleId'>): any {
    return db.insert(buvetteCardMovementsTable).values({ ...values, saleId: saleIdOf(saleClientId) });
  }
}
