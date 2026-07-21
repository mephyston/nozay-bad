import { eq } from 'drizzle-orm';
import { categoriesTable } from '../../shared/schema';

export class DeleteCategoryRepository {
  async deleteCategory(db: any, id: number): Promise<any> {
    return db.delete(categoriesTable).where(eq(categoriesTable.id, id)).returning().get();
  }
}
