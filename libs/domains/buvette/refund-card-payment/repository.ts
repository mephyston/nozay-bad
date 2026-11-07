import { and, eq, lt } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { buvetteCardAttemptsTable, buvetteSalesTable, buvetteSumUpRefundsTable } from '../shared/schema';

export class RefundCardPaymentRepository {
  getAttempt(db: DbOrTx, attemptId: number) {
    return db
      .select({
        id: buvetteCardAttemptsTable.id,
        foreignTxId: buvetteCardAttemptsTable.foreignTxId,
        status: buvetteCardAttemptsTable.status,
        anomaly: buvetteCardAttemptsTable.anomaly,
        amountCents: buvetteCardAttemptsTable.amountCents,
        transactionCode: buvetteCardAttemptsTable.transactionCode,
        saleStatus: buvetteSalesTable.status
      })
      .from(buvetteCardAttemptsTable)
      .innerJoin(buvetteSalesTable, eq(buvetteCardAttemptsTable.saleId, buvetteSalesTable.id))
      .where(eq(buvetteCardAttemptsTable.id, attemptId))
      .get();
  }

  getRefund(db: DbOrTx, attemptId: number) {
    return db.select().from(buvetteSumUpRefundsTable).where(eq(buvetteSumUpRefundsTable.attemptId, attemptId)).get();
  }

  /** La clé unique fait foi : de deux demandes simultanées, une seule crée la ligne. */
  async claim(db: DbOrTx, attemptId: number, by: string, now: Date): Promise<boolean> {
    try {
      await db.insert(buvetteSumUpRefundsTable).values({ attemptId, status: 'pending', requestedByEmail: by, requestedAt: now });
      return true;
    } catch (error) {
      if (/UNIQUE/i.test(String(error))) return false;
      throw error;
    }
  }

  /** Une relance après un échec : seule celle qui fait passer la ligne à `pending` envoie. */
  async reclaim(db: DbOrTx, attemptId: number, by: string, now: Date): Promise<boolean> {
    const result: any = await db.update(buvetteSumUpRefundsTable)
      .set({ status: 'pending', error: null, requestedByEmail: by, requestedAt: now })
      .where(and(eq(buvetteSumUpRefundsTable.attemptId, attemptId), eq(buvetteSumUpRefundsTable.status, 'failed')));
    return Boolean(result?.meta?.changes ?? result?.changes);
  }

  markDone(db: DbOrTx, attemptId: number, amountCents: number, now: Date) {
    return db.update(buvetteSumUpRefundsTable)
      .set({ status: 'done', amountCents, error: null, doneAt: now })
      .where(eq(buvetteSumUpRefundsTable.attemptId, attemptId));
  }

  markFailed(db: DbOrTx, attemptId: number, error: string) {
    return db.update(buvetteSumUpRefundsTable).set({ status: 'failed', error }).where(eq(buvetteSumUpRefundsTable.attemptId, attemptId));
  }

  pendingBefore(db: DbOrTx, before: Date) {
    return db.select({ attemptId: buvetteSumUpRefundsTable.attemptId }).from(buvetteSumUpRefundsTable)
      .where(and(eq(buvetteSumUpRefundsTable.status, 'pending'), lt(buvetteSumUpRefundsTable.requestedAt, before)))
      .all();
  }
}
