import { and, eq, desc } from 'drizzle-orm';
import { bankTransactionsTable, transactionsTable } from '../data-access/src/schema';
import { membersTable } from '@metacult/features-members-data-access';

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
    return db.select().from(membersTable).where(eq(membersTable.season, seasonId)).all();
  }

  async getPastReconciledTransactions(db: any): Promise<any[]> {
    return db.select({
      fitid: bankTransactionsTable.fitid,
      name: bankTransactionsTable.name,
      memo: bankTransactionsTable.memo,
      amount: bankTransactionsTable.amount,
      category: transactionsTable.category,
      memberLastName: membersTable.lastName,
      memberFirstName: membersTable.firstName
    })
      .from(bankTransactionsTable)
      .innerJoin(transactionsTable, eq(transactionsTable.bankTransactionId, bankTransactionsTable.id))
      .leftJoin(membersTable, eq(membersTable.id, transactionsTable.memberId))
      .where(eq(bankTransactionsTable.status, 'reconciled'))
      .orderBy(desc(bankTransactionsTable.id))
      .limit(20)
      .all();
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
