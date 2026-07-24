import { type DbOrTx } from '@nba/db';
import { bankStatementLinesTable } from '../../shared/schema';

export class ImportBankStatementRepository {
  async insertBankStatementLine(db: DbOrTx, values: any): Promise<{ changes: number }> {
    const res = await db.insert(bankStatementLinesTable)
      .values({
        fitid: values.fitid,
        accountId: typeof values.accountId === 'number' ? values.accountId : 1,
        amountCents: values.amountCents ?? values.amount ?? 0,
        date: values.date,
        name: values.name,
        memo: values.memo || null,
        status: values.status || 'pending',
        createdAt: values.createdAt || new Date()
      })
      .onConflictDoNothing()
      .run();
    const changes = res?.meta?.changes ?? 0;
    return { changes };
  }
}
