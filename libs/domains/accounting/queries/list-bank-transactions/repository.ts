import { and, eq, desc } from 'drizzle-orm';
import { bankTransactionsTable } from '../../data-access/src/schema';

export class ListBankTransactionsRepository {
  async listBankTransactions(db: any, seasonId: string, filters: { status?: string; accountId?: string }): Promise<any[]> {
    const conditions = [eq(bankTransactionsTable.seasonId, seasonId)];
    if (filters?.status) {
      conditions.push(eq(bankTransactionsTable.status, filters.status as any));
    }
    if (filters?.accountId) {
      conditions.push(eq(bankTransactionsTable.accountId, filters.accountId as any));
    }
    return db.select()
      .from(bankTransactionsTable)
      .where(and(...conditions))
      .orderBy(desc(bankTransactionsTable.date), desc(bankTransactionsTable.id))
      .all();
  }
}
