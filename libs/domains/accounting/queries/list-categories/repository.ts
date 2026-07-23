import { type DbOrTx } from '@metacult/shared-db';
import { categoriesTable } from '../../shared/schema';

export class ListCategoriesRepository {
  async listCategories(db: DbOrTx): Promise<any[]> {
    return db.select().from(categoriesTable).all();
  }
}
