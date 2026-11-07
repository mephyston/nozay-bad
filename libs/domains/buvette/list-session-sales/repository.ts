import { and, desc, eq, inArray, isNull } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { buvetteCardAttemptsTable, buvetteCardMovementsTable, buvetteCardsTable, buvetteSaleLinesTable, buvetteSalesTable, buvetteSumUpRefundsTable } from '../shared/schema';

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

  /** Le paiement CB réussi de chaque vente : une vente n'en a qu'un. */
  cardPayments(db: DbOrTx, saleIds: number[]) {
    return db
      .select({
        saleId: buvetteCardAttemptsTable.saleId,
        attemptId: buvetteCardAttemptsTable.id,
        transactionCode: buvetteCardAttemptsTable.transactionCode,
        refundStatus: buvetteSumUpRefundsTable.status
      })
      .from(buvetteCardAttemptsTable)
      .leftJoin(buvetteSumUpRefundsTable, eq(buvetteSumUpRefundsTable.attemptId, buvetteCardAttemptsTable.id))
      .where(and(inArray(buvetteCardAttemptsTable.saleId, saleIds), eq(buvetteCardAttemptsTable.status, 'successful')))
      .all();
  }

  /** Les soldes rendus en espèces : des mouvements `refund` sans vente. */
  cardRefunds(db: DbOrTx, sessionId: number, limit: number) {
    return db
      .select({ id: buvetteCardMovementsTable.id, createdAt: buvetteCardMovementsTable.createdAt, amountCents: buvetteCardMovementsTable.amountCents, cardId: buvetteCardMovementsTable.cardId })
      .from(buvetteCardMovementsTable)
      .where(and(eq(buvetteCardMovementsTable.sessionId, sessionId), eq(buvetteCardMovementsTable.type, 'refund'), isNull(buvetteCardMovementsTable.saleId)))
      .orderBy(desc(buvetteCardMovementsTable.id))
      .limit(limit)
      .all();
  }
}
