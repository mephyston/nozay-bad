import { type DbOrTx } from '@nba/db';
import { eq } from 'drizzle-orm';
import { accountsTable, bankStatementBalancesTable, bankStatementLinesTable } from '../../shared/schema';

export class ImportBankStatementRepository {
  async getAccountByCode(db: DbOrTx, code: string): Promise<{ id: number; code: string } | undefined> {
    return db.select({ id: accountsTable.id, code: accountsTable.code })
      .from(accountsTable)
      .where(eq(accountsTable.code, code))
      .get();
  }

  async insertBankStatementLine(db: DbOrTx, values: any): Promise<{ changes: number }> {
    const res = await db.insert(bankStatementLinesTable)
      .values({
        fitid: values.fitid,
        accountId: values.accountId,
        amountCents: values.amountCents ?? 0,
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

  /**
   * Réimporter le même relevé écrase l'arrêté au lieu d'en empiler un second : la banque
   * n'annonce qu'un solde par compte et par date, et deux lignes concurrentes ne feraient
   * qu'ouvrir la question de savoir laquelle croire.
   */
  async upsertBankStatementBalance(db: DbOrTx, values: { accountId: number; date: string; balanceCents: number; createdAt: Date }): Promise<void> {
    await db.insert(bankStatementBalancesTable)
      .values(values)
      .onConflictDoUpdate({
        target: [bankStatementBalancesTable.accountId, bankStatementBalancesTable.date],
        set: { balanceCents: values.balanceCents }
      })
      .run();
  }
}
