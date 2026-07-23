import { type DbOrTx } from '@nba/db';
import { eq } from 'drizzle-orm';
import { invoicesTable } from '../../shared/schema';

export class ListInvoicesRepository {
  async list(db: DbOrTx, seasonId: string): Promise<any[]> {
    return db.select().from(invoicesTable).where(eq(invoicesTable.seasonId, seasonId)).all();
  }
}
