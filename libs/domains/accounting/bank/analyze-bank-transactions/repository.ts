import { and, eq, desc, sql } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { bankStatementLinesTable, categoriesTable, ledgerEntriesTable } from '../../shared/schema';
import { getMembersBySeason, getMembersByIds } from '@nba/members-api';

export class AnalyzeBankTransactionsRepository {
  async getCategories(db: DbOrTx): Promise<(typeof categoriesTable.$inferSelect)[]> {
    return db.select().from(categoriesTable).all();
  }
  async getPendingTransactions(db: DbOrTx, seasonId: string, singleId?: number): Promise<(typeof bankStatementLinesTable.$inferSelect)[]> {
    const conditions = [
      eq(bankStatementLinesTable.seasonId, seasonId),
      eq(bankStatementLinesTable.status, 'pending')
    ];
    if (singleId) {
      conditions.push(eq(bankStatementLinesTable.id, singleId));
    }
    return db.select().from(bankStatementLinesTable).where(and(...conditions)).all();
  }

  async getMembersBySeason(db: DbOrTx, seasonId: string): Promise<any[]> {
    return getMembersBySeason(db, seasonId);
  }

  async getPastReconciledTransactions(db: DbOrTx): Promise<any[]> {
    const txs = await db.select({
      fitid: bankStatementLinesTable.fitid,
      name: bankStatementLinesTable.name,
      memo: bankStatementLinesTable.memo,
      amount: bankStatementLinesTable.amount,
      category: ledgerEntriesTable.category,
      memberId: ledgerEntriesTable.memberId
    })
      .from(bankStatementLinesTable)
      .innerJoin(ledgerEntriesTable, eq(ledgerEntriesTable.bankStatementLineId, bankStatementLinesTable.id))
      .where(eq(bankStatementLinesTable.status, 'reconciled'))
      .orderBy(desc(bankStatementLinesTable.id))
      .limit(20)
      .all();

    const memberIds = Array.from(new Set(txs.map((t) => t.memberId).filter((id) => id !== null))) as number[];
    const members = memberIds.length > 0 ? await getMembersByIds(db, memberIds) : [];
    const membersMap = new Map(members.map((m) => [m.id, m]));

    return txs.map((t) => {
      const m = t.memberId ? membersMap.get(t.memberId) : null;
      return {
        fitid: t.fitid,
        name: t.name,
        memo: t.memo,
        amount: t.amount,
        category: t.category,
        memberLastName: m ? m.lastName : null,
        memberFirstName: m ? m.firstName : null
      };
    });
  }

  async getActiveProducts(db: DbOrTx): Promise<any[]> {
    return db.all(sql`
      SELECT id, name, category, price, stock, active, created_at as createdAt 
      FROM products WHERE active = 1
    `);
  }

  async updateAISuggestions(db: DbOrTx, id: number, suggestions: any): Promise<void> {
    await db.update(bankStatementLinesTable)
      .set({ aiSuggestions: JSON.stringify(suggestions) })
      .where(eq(bankStatementLinesTable.id, id))
      .run();
  }
}
