import { type DbOrTx } from '@nba/db';
import { categoriesTable } from '../../shared/schema';

export class ListCategoriesRepository {
  async listCategories(db: DbOrTx): Promise<any[]> {
    return db.select().from(categoriesTable).all();
  }
}
