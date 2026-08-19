import { asc } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { cmsPostCategoriesTable, type CmsPostCategoryRow } from '../../shared/schema';

export class ListPostCategoriesRepository {
  async list(db: DbOrTx): Promise<CmsPostCategoryRow[]> {
    return db.select().from(cmsPostCategoriesTable).orderBy(asc(cmsPostCategoriesTable.navOrder), asc(cmsPostCategoriesTable.name)).all();
  }
}
