import { type DbOrTx } from '@nba/db';
import { eq } from 'drizzle-orm';
import { transactionsTable } from '../../shared/schema';

export class UpdateTransactionRepository {
  async getById(db: DbOrTx, id: number): Promise<any | undefined> {
    return db.select().from(transactionsTable).where(eq(transactionsTable.id, id)).get();
  }

  async update(db: DbOrTx, id: number, values: any): Promise<any | undefined> {
    return db.update(transactionsTable).set(values).where(eq(transactionsTable.id, id)).returning().get();
  }
}
