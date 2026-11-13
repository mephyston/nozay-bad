import { type DbOrTx } from '@nba/db';
import { eq } from 'drizzle-orm';
import { cashHandoversTable, cashReceiptsTable } from '../../shared/schema';

export class RenewCashTokenRepository {
  async setToken(db: DbOrTx, kind: 'receipt' | 'handover', id: number, tokenHash: string, tokenExpiresAt: Date) {
    if (kind === 'receipt') {
      await db.update(cashReceiptsTable).set({ tokenHash, tokenExpiresAt }).where(eq(cashReceiptsTable.id, id)).run();
    } else {
      await db.update(cashHandoversTable).set({ tokenHash, tokenExpiresAt }).where(eq(cashHandoversTable.id, id)).run();
    }
  }
}
