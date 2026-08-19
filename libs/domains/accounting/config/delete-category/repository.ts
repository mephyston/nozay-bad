import { categoriesTable, ledgerEntriesTable } from '@nba/accounting/schema';
import { type DbOrTx } from '@nba/db';
import { eq } from 'drizzle-orm';


export class DeleteCategoryRepository {
  async isCategoryUsed(db: DbOrTx, id: number): Promise<boolean> {
    const usage = await db.select({ id: ledgerEntriesTable.id })
      .from(ledgerEntriesTable)
      .where(eq(ledgerEntriesTable.categoryId, id))
      .limit(1);
    return usage.length > 0;
  }

  async deleteCategory(db: DbOrTx, id: number): Promise<any> {
    return db.delete(categoriesTable).where(eq(categoriesTable.id, id)).returning().get();
  }
}
