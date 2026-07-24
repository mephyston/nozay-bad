import { type DbOrTx } from '@nba/db';
import { and, eq, gte, lte, desc } from 'drizzle-orm';
import { bankTransactionsTable } from '../../shared/schema';

export class ListBankTransactionsRepository {
  async listBankTransactions(db: DbOrTx, seasonId?: string, filters?: { status?: string; accountId?: string; startDate?: string; endDate?: string }): Promise<any[]> {
    const conditions = [];
    if (filters?.status) {
      conditions.push(eq(bankTransactionsTable.status, filters.status as any));
    }
    if (filters?.accountId) {
      conditions.push(eq(bankTransactionsTable.accountId, filters.accountId as any));
    }
    if (filters?.startDate) {
      conditions.push(gte(bankTransactionsTable.date, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(bankTransactionsTable.date, filters.endDate));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return db.select()
      .from(bankTransactionsTable)
      .where(whereClause)
      .orderBy(desc(bankTransactionsTable.date), desc(bankTransactionsTable.id))
      .all();
  }
}
