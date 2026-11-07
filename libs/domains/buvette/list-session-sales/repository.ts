import { desc, eq, inArray } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { buvetteCardsTable, buvetteSaleLinesTable, buvetteSalesTable } from '../shared/schema';

export class ListSessionSalesRepository {
  /** Bornée : une caisse revient sur ses dernières ventes, pas sur tout un tournoi d'un coup. */
  sales(db: DbOrTx, sessionId: number, limit: number) {
    return db.select().from(buvetteSalesTable)
      .where(eq(buvetteSalesTable.sessionId, sessionId))
      .orderBy(desc(buvetteSalesTable.id))
      .limit(limit)
      .all();
  }

  cards(db: DbOrTx, cardIds: number[]) {
    return db.select().from(buvetteCardsTable).where(inArray(buvetteCardsTable.id, cardIds)).all();
  }

  lines(db: DbOrTx, saleIds: number[]) {
    return db
      .select({
        saleId: buvetteSaleLinesTable.saleId,
        name: buvetteSaleLinesTable.name,
        quantity: buvetteSaleLinesTable.quantity,
        unitPriceCents: buvetteSaleLinesTable.unitPriceCents
      })
      .from(buvetteSaleLinesTable)
      .where(inArray(buvetteSaleLinesTable.saleId, saleIds))
      .all();
  }
}
