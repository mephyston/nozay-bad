import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { buvetteCardsTable, buvetteItemsTable, buvetteOrderLinesTable, buvetteOrdersTable } from '../shared/schema';

export class ListOrdersRepository {
  /** Bornée à la session ouverte : une commande oubliée hier n'encombre pas le service d'aujourd'hui. */
  pending(db: DbOrTx, since: Date, search: { id: number | null; email: string | null }, limit: number) {
    const filters = [eq(buvetteOrdersTable.status, 'pending'), sql`${buvetteOrdersTable.createdAt} >= ${Math.floor(since.getTime() / 1000)}`];
    if (search.id !== null) filters.push(eq(buvetteOrdersTable.id, search.id));
    if (search.email !== null) filters.push(sql`${buvetteCardsTable.email} LIKE ${`${search.email}%`} ESCAPE '\\'`);
    return db
      .select({
        id: buvetteOrdersTable.id,
        createdAt: buvetteOrdersTable.createdAt,
        email: buvetteCardsTable.email,
        balanceCents: buvetteCardsTable.balanceCents,
        reservedCents: buvetteCardsTable.reservedCents
      })
      .from(buvetteOrdersTable)
      .innerJoin(buvetteCardsTable, eq(buvetteOrdersTable.cardId, buvetteCardsTable.id))
      .where(and(...filters))
      .orderBy(desc(buvetteOrdersTable.id))
      .limit(limit)
      .all();
  }

  lines(db: DbOrTx, orderIds: number[]) {
    return db
      .select({
        orderId: buvetteOrderLinesTable.orderId,
        name: buvetteItemsTable.name,
        quantity: buvetteOrderLinesTable.quantity,
        unitPriceCents: buvetteItemsTable.priceCents,
        available: buvetteItemsTable.active
      })
      .from(buvetteOrderLinesTable)
      .innerJoin(buvetteItemsTable, eq(buvetteOrderLinesTable.itemId, buvetteItemsTable.id))
      .where(inArray(buvetteOrderLinesTable.orderId, orderIds))
      .all();
  }
}
