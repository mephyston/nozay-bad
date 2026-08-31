import { type DbOrTx } from '@nba/db';
import { and, eq, gte, lte, desc } from 'drizzle-orm';
import { bankStatementLinesTable } from '../../shared/schema';

export interface ListBankStatementLinesConditions {
  status?: string;
  accountId?: number;
  startDate?: string;
  endDate?: string;
  /** Nombre maximal de lignes rendues. Sans lui, la liste n'est bornée que par ses filtres. */
  limit?: number;
  offset?: number;
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

    /*
     * Le tri suit `bank_statement_lines_date_id_idx` (migration 0027), et le filtre par état
     * suit `bank_statement_lines_status_date_idx` (0028). C'est ce qui permet à une demande
     * bornée de ne lire que ce qu'elle rend : sans index, SQLite lisait la table entière puis
     * la triait, quelle que soit la borne — 1 188 lignes mesurées par appel en production.
     */
    const query = db.select()
      .from(bankStatementLinesTable)
      .where(whereClause)
      .orderBy(desc(bankStatementLinesTable.date), desc(bankStatementLinesTable.id));

    if (filters?.limit === undefined) return query.all();

    // `offset` sans `limit` n'a pas de sens en SQLite ; il n'est lu que si une borne est posée.
    return query.limit(filters.limit).offset(filters.offset ?? 0).all();
  }
}
