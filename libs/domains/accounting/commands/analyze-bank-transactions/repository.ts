import { and, eq, desc, sql } from 'drizzle-orm';
import { bankTransactionsTable, transactionsTable } from '../../shared/schema';
import { getMembersBySeason, getMembersByIds } from '@metacult/features-members-api';

export class AnalyzeBankTransactionsRepository {
  async getPendingTransactions(db: any, seasonId: string, singleId?: number): Promise<any[]> {
    const conditions = [
      eq(bankTransactionsTable.seasonId, seasonId),
      eq(bankTransactionsTable.status, 'pending')
    ];
    if (singleId) {
      conditions.push(eq(bankTransactionsTable.id, singleId));
    }
    return db.select().from(bankTransactionsTable).where(and(...conditions)).all();
  }

  async getMembersBySeason(db: any, seasonId: string): Promise<any[]> {
    return getMembersBySeason(db, seasonId);
  }

  async getPastReconciledTransactions(db: any): Promise<any[]> {
    const txs = await db.select({
      fitid: bankTransactionsTable.fitid,
      name: bankTransactionsTable.name,
      memo: bankTransactionsTable.memo,
      amount: bankTransactionsTable.amount,
      category: transactionsTable.category,
      memberId: transactionsTable.memberId
    })
      .from(bankTransactionsTable)
      .innerJoin(transactionsTable, eq(transactionsTable.bankTransactionId, bankTransactionsTable.id))
      .where(eq(bankTransactionsTable.status, 'reconciled'))
      .orderBy(desc(bankTransactionsTable.id))
      .limit(20)
      .all();

    const memberIds = Array.from(new Set(txs.map((t: any) => t.memberId).filter((id: any) => id !== null))) as number[];
    const members = memberIds.length > 0 ? await getMembersByIds(db, memberIds) : [];
    const membersMap = new Map(members.map((m: any) => [m.id, m]));

    return txs.map((t: any) => {
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

  async getActiveProducts(db: any): Promise<any[]> {
    return db.all(sql`
      SELECT id, name, category, price, stock, active, created_at as createdAt 
      FROM products WHERE active = 1
    `);
  }

  async updateAISuggestions(db: any, id: number, suggestions: any): Promise<void> {
    await db.update(bankTransactionsTable)
      .set({ aiSuggestions: JSON.stringify(suggestions) })
      .where(eq(bankTransactionsTable.id, id))
      .run();
  }
}
