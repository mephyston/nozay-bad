import { and, eq, desc } from 'drizzle-orm';
import { bankTransactionsTable, transactionsTable } from '../data-access/src/schema';
import { getMembersBySeason, getMembersByIds } from '@metacult/features-members-api';

export class BankRepository {
  async listBankTransactions(db: any, seasonId: string, filters: { status?: string; accountId?: string }): Promise<any[]> {
    const conditions = [eq(bankTransactionsTable.seasonId, seasonId)];
    if (filters.status) {
      conditions.push(eq(bankTransactionsTable.status, filters.status as any));
    }
    if (filters.accountId) {
      conditions.push(eq(bankTransactionsTable.accountId, filters.accountId as any));
    }
    return db.select()
      .from(bankTransactionsTable)
      .where(and(...conditions))
      .orderBy(desc(bankTransactionsTable.date), desc(bankTransactionsTable.id))
      .all();
  }

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
    const members = await getMembersByIds(db, memberIds);
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

  async updateAISuggestions(db: any, id: number, suggestions: any): Promise<void> {
    await db.update(bankTransactionsTable)
      .set({ aiSuggestions: JSON.stringify(suggestions) })
      .where(eq(bankTransactionsTable.id, id))
      .run();
  }

  async updateStatus(db: any, id: number, status: 'pending' | 'ignored'): Promise<void> {
    await db.update(bankTransactionsTable)
      .set({ status })
      .where(eq(bankTransactionsTable.id, id))
      .run();
  }
}
