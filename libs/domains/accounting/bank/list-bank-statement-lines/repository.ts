import { type DbOrTx } from '@nba/db';
import { and, eq, gte, lte, desc } from 'drizzle-orm';
import { bankStatementLinesTable } from '../../shared/schema';

export class ListBankStatementLinesRepository {
  async listBankStatementLines(db: DbOrTx, seasonId?: string, filters?: { status?: string; accountId?: string; startDate?: string; endDate?: string }): Promise<any[]> {
    const conditions = [];
    if (filters?.status) {
      conditions.push(eq(bankStatementLinesTable.status, filters.status as any));
    }
    if (filters?.accountId) {
      conditions.push(eq(bankStatementLinesTable.accountId, filters.accountId as any));
    }
    if (filters?.startDate) {
      conditions.push(gte(bankStatementLinesTable.date, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(bankStatementLinesTable.date, filters.endDate));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return db.select()
      .from(bankStatementLinesTable)
      .where(whereClause)
      .orderBy(desc(bankStatementLinesTable.date), desc(bankStatementLinesTable.id))
      .all();
  }
}
