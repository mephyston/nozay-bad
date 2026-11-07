import { and, eq, inArray, sql } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import {
  buvetteCardAttemptsTable,
  buvetteCardMovementsTable,
  buvetteCardsTable,
  buvetteItemsTable,
  buvetteOrderLinesTable,
  buvetteOrdersTable,
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

  getOrder(db: DbOrTx, id: number) {
    return db.select().from(buvetteOrdersTable).where(eq(buvetteOrdersTable.id, id)).get();
  }

  orderLines(db: DbOrTx, orderId: number) {
    return db.select({ itemId: buvetteOrderLinesTable.itemId, quantity: buvetteOrderLinesTable.quantity })
      .from(buvetteOrderLinesTable)
      .where(eq(buvetteOrderLinesTable.orderId, orderId))
      .all();
  }

  buildCollectOrderStatement(db: DbOrTx, orderId: number): any {
    return db.update(buvetteOrdersTable).set({ status: 'collected' })
      .where(and(eq(buvetteOrdersTable.id, orderId), eq(buvetteOrdersTable.status, 'pending')));
  }

  items(db: DbOrTx, ids: number[]) {
    return db.select().from(buvetteItemsTable).where(inArray(buvetteItemsTable.id, ids)).all();
  }

  /**
   * La session est relue dans l'instruction : si elle vient d'être clôturée, la sous-requête
   * rend NULL, la contrainte NOT NULL échoue et le lot entier est annulé.
   */
  buildSaleStatement(db: DbOrTx, sessionId: number, values: Omit<typeof buvetteSalesTable.$inferInsert, 'sessionId'>): any {
    // Une commande annulée par le client à cet instant annule la vente de la même façon.
    const orderStillPending = values.orderId
      ? sql`AND EXISTS (SELECT 1 FROM ${buvetteOrdersTable} WHERE ${buvetteOrdersTable.id} = ${values.orderId} AND ${buvetteOrdersTable.status} = 'pending')`
      : sql``;
    return db.insert(buvetteSalesTable).values({
      ...values,
      sessionId: sql`(SELECT ${buvetteSessionsTable.id} FROM ${buvetteSessionsTable} WHERE ${buvetteSessionsTable.id} = ${sessionId} AND ${buvetteSessionsTable.status} = 'open' ${orderStillPending})` as any
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

  /** Le CHECK de la réservation annule le lot si la carte n'a plus ce disponible. */
  buildReserveStatement(db: DbOrTx, cardId: number, amountCents: number): any {
    return db.update(buvetteCardsTable)
      .set({ reservedCents: sql`${buvetteCardsTable.reservedCents} + ${amountCents}` })
      .where(eq(buvetteCardsTable.id, cardId));
  }

  buildAttemptStatement(db: DbOrTx, saleClientId: string, foreignTxId: string, amountCents: number): any {
    return db.insert(buvetteCardAttemptsTable).values({ saleId: saleIdOf(saleClientId), foreignTxId, amountCents, createdAt: new Date() });
  }

  pendingAttempt(db: DbOrTx, saleId: number) {
    return db.select().from(buvetteCardAttemptsTable)
      .where(and(eq(buvetteCardAttemptsTable.saleId, saleId), eq(buvetteCardAttemptsTable.status, 'pending')))
      .get();
  }

  buildMovementStatement(db: DbOrTx, saleClientId: string, values: Omit<typeof buvetteCardMovementsTable.$inferInsert, 'saleId'>): any {
    return db.insert(buvetteCardMovementsTable).values({ ...values, saleId: saleIdOf(saleClientId) });
  }
}
