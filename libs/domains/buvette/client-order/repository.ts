import { and, asc, eq, sql } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { buvetteItemsTable, buvetteOrderLinesTable, buvetteOrdersTable } from '../shared/schema';

export class ClientOrderRepository {
  activeItems(db: DbOrTx) {
    return db
      .select({ id: buvetteItemsTable.id, name: buvetteItemsTable.name, priceCents: buvetteItemsTable.priceCents })
      .from(buvetteItemsTable)
      .where(eq(buvetteItemsTable.active, true))
      .orderBy(asc(buvetteItemsTable.sortOrder), asc(buvetteItemsTable.name))
      .all();
  }

  pending(db: DbOrTx, cardId: number) {
    return db.select().from(buvetteOrdersTable)
      .where(and(eq(buvetteOrdersTable.cardId, cardId), eq(buvetteOrdersTable.status, 'pending')))
      .get();
  }

  lines(db: DbOrTx, orderId: number) {
    return db
      .select({
        itemId: buvetteOrderLinesTable.itemId,
        name: buvetteItemsTable.name,
        quantity: buvetteOrderLinesTable.quantity,
        unitPriceCents: buvetteItemsTable.priceCents
      })
      .from(buvetteOrderLinesTable)
      .innerJoin(buvetteItemsTable, eq(buvetteOrderLinesTable.itemId, buvetteItemsTable.id))
      .where(eq(buvetteOrderLinesTable.orderId, orderId))
      .all();
  }

  buildCancelPendingStatement(db: DbOrTx, cardId: number): any {
    return db.update(buvetteOrdersTable).set({ status: 'cancelled' })
      .where(and(eq(buvetteOrdersTable.cardId, cardId), eq(buvetteOrdersTable.status, 'pending')));
  }

  /** Relue dans l'instruction : encaissée entre-temps, la commande garde ses articles. */
  buildClearLinesStatement(db: DbOrTx, cardId: number): any {
    return db.delete(buvetteOrderLinesTable).where(
      sql`${buvetteOrderLinesTable.orderId} = (SELECT ${buvetteOrdersTable.id} FROM ${buvetteOrdersTable} WHERE ${buvetteOrdersTable.cardId} = ${cardId} AND ${buvetteOrdersTable.status} = 'pending')`
    );
  }

  /** Le numéro se calcule dans l'instruction : deux commandes simultanées ne prennent pas le même. */
  buildCreateStatement(db: DbOrTx, cardId: number, sessionId: number): any {
    return db.insert(buvetteOrdersTable).values({
      cardId,
      sessionId,
      number: sql`(SELECT COALESCE(MAX(o.number), 0) + 1 FROM buvette_orders o WHERE o.session_id = ${sessionId})` as any,
      status: 'pending',
      createdAt: new Date()
    });
  }

  /** Rattachée par la carte : une seule commande en cours par carte, l'index y veille. */
  buildLineStatement(db: DbOrTx, cardId: number, itemId: number, quantity: number): any {
    return db.insert(buvetteOrderLinesTable).values({
      orderId: sql`(SELECT ${buvetteOrdersTable.id} FROM ${buvetteOrdersTable} WHERE ${buvetteOrdersTable.cardId} = ${cardId} AND ${buvetteOrdersTable.status} = 'pending')` as any,
      itemId,
      quantity
    });
  }
}
