import { eq } from 'drizzle-orm';
import { transactionsTable, checksTable } from '../../shared/schema';
import { getAllMembers } from '@metacult/features-members-api';

export class RecordCheckTransactionRepository {
  async getAllMembers(db: any): Promise<any[]> {
    return getAllMembers(db);
  }

  async createTransaction(db: any, values: any): Promise<any> {
    return db.insert(transactionsTable).values(values).returning().get();
  }

  async createCheck(db: any, values: any): Promise<any> {
    return db.insert(checksTable).values(values).returning().get();
  }

  async getCheckById(db: any, id: number): Promise<any | undefined> {
    return db.select().from(checksTable).where(eq(checksTable.id, id)).get();
  }

  async getTransactionById(db: any, id: number): Promise<any | undefined> {
    return db.select().from(transactionsTable).where(eq(transactionsTable.id, id)).get();
  }

  async unlinkCheckTransaction(db: any, id: number): Promise<void> {
    await db.update(checksTable).set({ transactionId: null }).where(eq(checksTable.id, id)).run();
  }

  async deleteTransaction(db: any, id: number): Promise<void> {
    await db.delete(transactionsTable).where(eq(transactionsTable.id, id)).run();
  }

  async deleteCheck(db: any, id: number): Promise<void> {
    await db.delete(checksTable).where(eq(checksTable.id, id)).run();
  }
}
