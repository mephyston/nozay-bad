import { and, eq, sql } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { buvetteSalesTable } from '../shared/schema';

export class GetCurrentSessionRepository {
  totals(db: DbOrTx, sessionId: number) {
    return db
      .select({
        salesCount: sql<number>`COUNT(*)`,
        prepaidCents: sql<number>`COALESCE(SUM(${buvetteSalesTable.prepaidCents}), 0)`
      })
      .from(buvetteSalesTable)
      .where(and(eq(buvetteSalesTable.sessionId, sessionId), eq(buvetteSalesTable.status, 'paid')))
      .get();
  }
}
