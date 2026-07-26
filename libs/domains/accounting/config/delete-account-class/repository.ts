import { type DbOrTx } from '@nba/db';
import { eq, sql, or } from 'drizzle-orm';
import { accountClassesTable, categoriesTable } from '../../shared/schema';

export class DeleteAccountClassRepository {
  async isAccountClassUsed(db: DbOrTx, code: string): Promise<boolean> {
    const numCode = Number(code);
    const targetCode = !isNaN(numCode) ? String(numCode) : code;
    
    // First find the account class ID
    const accountClass = await db.select({ id: accountClassesTable.id })
      .from(accountClassesTable)
      .where(eq(accountClassesTable.code, targetCode))
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
    const numCode = Number(code);
    const targetCode = !isNaN(numCode) ? String(numCode) : code;
    return db.delete(accountClassesTable).where(eq(accountClassesTable.code, targetCode)).returning().get();
  }
}
