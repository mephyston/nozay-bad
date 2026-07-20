import { eq } from 'drizzle-orm';
import { transactionsTable } from '../../data-access/src/schema';

export class UpdateTransactionRepository {
  async getById(db: any, id: number): Promise<any | undefined> {
    return db.select().from(transactionsTable).where(eq(transactionsTable.id, id)).get();
  }

  async update(db: any, id: number, values: any): Promise<any | undefined> {
    return db.update(transactionsTable).set(values).where(eq(transactionsTable.id, id)).returning().get();
  }
}
