import { eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { cmsPostsTable, cmsPostCategoryLinksTable, cmsPagesTable, type CmsPostRow } from '../../shared/schema';

export class CreatePostRepository {
  /**
   * Une page occupe-t-elle déjà ce chemin ?
   *
   * Pages et articles partagent l'espace des URL — les articles WordPress sont à
   * plat, sans préfixe. Deux tables, un seul espace de noms : le contrôle croisé est
   * donc indispensable, l'index unique de chaque table ne le voit pas.
   */
  async pathTaken(db: DbOrTx, path: string): Promise<boolean> {
    const post = await db.select().from(cmsPostsTable).where(eq(cmsPostsTable.path, path)).get();
    if (post) return true;
    const page = await db.select().from(cmsPagesTable).where(eq(cmsPagesTable.path, path)).get();
    return Boolean(page);
  }

  async insert(db: DbOrTx, values: typeof cmsPostsTable.$inferInsert): Promise<CmsPostRow> {
    const [row] = await db.insert(cmsPostsTable).values(values).returning();
    return row;
  }

  async linkCategories(db: DbOrTx, postId: number, categoryIds: number[]): Promise<void> {
    if (categoryIds.length === 0) return;
    await db
      .insert(cmsPostCategoryLinksTable)
      .values(categoryIds.map((categoryId) => ({ postId, categoryId })))
      .run();
  }
}
