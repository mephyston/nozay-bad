import { categoriesTable } from '@nba/accounting/schema';
import { type DbOrTx } from '@nba/db';
import { eq, sql, or } from 'drizzle-orm';
import { accountClassesTable } from '../../shared/schema';

export class DeleteAccountClassRepository {
  async isAccountClassUsed(db: DbOrTx, code: string): Promise<boolean> {
    // Le code est un texte, comparé tel quel.
    const accountClass = await db.select({ id: accountClassesTable.id })
      .from(accountClassesTable)
      .where(eq(accountClassesTable.code, String(code).trim()))
      .get();
      
    if (!accountClass) return false;

    // Check if any category uses this account class
    const categoryCount = await db.select({ count: sql<number>`count(*)` })
      .from(categoriesTable)
      .where(
        or(
          eq(categoriesTable.receiptAccountClassId, accountClass.id),
          eq(categoriesTable.expenseAccountClassId, accountClass.id)
        )
      )
      .get();
      
    return (categoryCount?.count || 0) > 0;
  }

  async deleteAccountClass(db: DbOrTx, code: string): Promise<any> {
    return db.delete(accountClassesTable).where(eq(accountClassesTable.code, String(code).trim())).returning().get();
  }
}
