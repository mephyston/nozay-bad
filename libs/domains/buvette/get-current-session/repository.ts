import { and, eq, isNotNull, sql } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { buvetteCardAttemptsTable, buvetteSalesTable } from '../shared/schema';

export class GetCurrentSessionRepository {
  inProgress(db: DbOrTx, sessionId: number) {
    return db
      .select({
        saleId: buvetteSalesTable.id,
        cardCents: buvetteSalesTable.cardCents,
        prepaidCents: buvetteSalesTable.prepaidCents,
        rechargeCents: buvetteSalesTable.rechargeCents,
        foreignTxId: buvetteCardAttemptsTable.foreignTxId,
        attemptStatus: buvetteCardAttemptsTable.status
      })
      .from(buvetteSalesTable)
      .leftJoin(buvetteCardAttemptsTable, eq(buvetteCardAttemptsTable.id, sql`(SELECT MAX(a.id) FROM buvette_card_attempts a WHERE a.sale_id = ${buvetteSalesTable.id})`))
      .where(and(eq(buvetteSalesTable.sessionId, sessionId), eq(buvetteSalesTable.status, 'in_progress')))
      .all();
  }

  toRefund(db: DbOrTx, sessionId: number) {
    return db
      .select({
        transactionCode: buvetteCardAttemptsTable.transactionCode,
        amountCents: buvetteCardAttemptsTable.amountCents,
        anomaly: buvetteCardAttemptsTable.anomaly
      })
      .from(buvetteCardAttemptsTable)
      .innerJoin(buvetteSalesTable, eq(buvetteCardAttemptsTable.saleId, buvetteSalesTable.id))
      .where(and(eq(buvetteSalesTable.sessionId, sessionId), isNotNull(buvetteCardAttemptsTable.anomaly)))
      .all();
  }

  totals(db: DbOrTx, sessionId: number) {
    return db
      .select({
        salesCount: sql<number>`COUNT(*)`,
        prepaidCents: sql<number>`COALESCE(SUM(${buvetteSalesTable.prepaidCents}), 0)`,
        cardCents: sql<number>`COALESCE(SUM(${buvetteSalesTable.cardCents}), 0)`
      })
      .from(buvetteSalesTable)
      .where(and(eq(buvetteSalesTable.sessionId, sessionId), eq(buvetteSalesTable.status, 'paid')))
      .get();
  }
}
