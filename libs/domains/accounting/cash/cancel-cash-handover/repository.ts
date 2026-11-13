import { type Db } from '@nba/db';
import { and, eq } from 'drizzle-orm';
import { cashHandoversTable, cashReceiptsTable } from '../../shared/schema';

export class CancelCashHandoverRepository {
  /** Les reçus redeviennent détenus par l'encaisseur, dans le même lot. */
  async cancel(db: Db, id: number) {
    await db.batch([
      db.update(cashReceiptsTable).set({ handoverId: null }).where(eq(cashReceiptsTable.handoverId, id)),
      db.update(cashHandoversTable).set({ status: 'cancelled', tokenHash: null, tokenExpiresAt: null })
        .where(and(eq(cashHandoversTable.id, id), eq(cashHandoversTable.status, 'pending')))
    ]);
  }
}
