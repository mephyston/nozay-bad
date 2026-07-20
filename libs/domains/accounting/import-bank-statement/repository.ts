import { bankTransactionsTable } from '../data-access/src/schema';

export class ImportBankStatementRepository {
  async insertBankTransaction(db: any, values: {
    fitid: string;
    seasonId: string;
    accountId: 'current' | 'savings';
    amount: number;
    date: string;
    name: string;
    memo: string | null;
    status: 'pending';
    createdAt: Date;
  }): Promise<{ changes: number }> {
    const res = await db.insert(bankTransactionsTable)
      .values(values)
      .onConflictDoNothing()
      .run();
    const changes = res?.meta?.changes ?? 0;
    return { changes };
  }
}
