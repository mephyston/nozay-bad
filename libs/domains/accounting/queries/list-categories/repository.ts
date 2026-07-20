import { categoriesTable } from '../../data-access/src/schema';

export class ListCategoriesRepository {
  async listCategories(db: any): Promise<any[]> {
    return db.select().from(categoriesTable).all();
  }
}
