import { eq, inArray } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import {
  cmsPostsTable, cmsPostCategoriesTable, cmsPostCategoryLinksTable,
  type CmsPostRow, type CmsPostCategoryRow
} from '../../shared/schema';

export class GetPostRepository {
  async findById(db: DbOrTx, id: number): Promise<CmsPostRow | undefined> {
    return db.select().from(cmsPostsTable).where(eq(cmsPostsTable.id, id)).get();
  }

  async categoriesOf(db: DbOrTx, postId: number): Promise<CmsPostCategoryRow[]> {
    const links = await db
      .select()
      .from(cmsPostCategoryLinksTable)
      .where(eq(cmsPostCategoryLinksTable.postId, postId))
      .all();
    if (links.length === 0) return [];
    return db
      .select()
      .from(cmsPostCategoriesTable)
      .where(inArray(cmsPostCategoriesTable.id, links.map((l) => l.categoryId)))
      .all();
  }
}
