import { eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { cmsPostCategoriesTable, type CmsPostCategoryRow } from '../../shared/schema';

export class SavePostCategoryRepository {
  async findBySlug(db: DbOrTx, slug: string): Promise<CmsPostCategoryRow | undefined> {
    return db.select().from(cmsPostCategoriesTable).where(eq(cmsPostCategoriesTable.slug, slug)).get();
  }
  async insert(db: DbOrTx, values: typeof cmsPostCategoriesTable.$inferInsert): Promise<CmsPostCategoryRow> {
    const [row] = await db.insert(cmsPostCategoriesTable).values(values).returning();
    return row;
  }
}
