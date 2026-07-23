import { type DbOrTx } from '@metacult/shared-db';
import { eq } from 'drizzle-orm';
import { categoriesTable } from '../../shared/schema';

export class DeleteCategoryRepository {
  async deleteCategory(db: DbOrTx, id: number): Promise<any> {
    return db.delete(categoriesTable).where(eq(categoriesTable.id, id)).returning().get();
  }
}
