import { type DbOrTx } from '@nba/db';
import { and, eq, gte, lte, desc } from 'drizzle-orm';
import { bankStatementLinesTable } from '../../shared/schema';

export interface ListBankStatementLinesConditions {
  status?: string;
  accountId?: number;
  startDate?: string;
  endDate?: string;
}

export class ListBankStatementLinesRepository {
  /**
   * Le repository ne résout plus rien : il reçoit des conditions déjà normalisées — un
   * identifiant de compte entier, un intervalle de dates. C'est le handler qui traduit
   * l'exercice et le code de compte, parce que lui seul peut refuser ce qui est introuvable.
   */
  async listBankStatementLines(db: DbOrTx, filters?: ListBankStatementLinesConditions): Promise<any[]> {
    const conditions = [];
    if (filters?.status) {
      conditions.push(eq(bankStatementLinesTable.status, filters.status as any));
    }
    if (filters?.accountId !== undefined) {
      conditions.push(eq(bankStatementLinesTable.accountId, filters.accountId));
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
