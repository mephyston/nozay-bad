import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import {
  cmsPagesTable,
  cmsPageBlocksTable,
  cmsPostsTable,
  cmsRedirectsTable,
  cmsMediaTable,
  cmsPostCategoriesTable,
  cmsPostCategoryLinksTable,
  type CmsMediaRow,
  type CmsPostCategoryRow,
  type CmsPageRow,
  type CmsPageBlockRow,
  type CmsPostRow,
  type CmsRedirectRow
} from '../../shared/schema';

export class ResolveRouteRepository {
  async findPage(db: DbOrTx, path: string, includeDrafts: boolean): Promise<CmsPageRow | undefined> {
    const condition = includeDrafts
      ? eq(cmsPagesTable.path, path)
      : and(eq(cmsPagesTable.path, path), eq(cmsPagesTable.status, 'published'));
    return db.select().from(cmsPagesTable).where(condition).get();
  }

  async findBlocks(db: DbOrTx, pageId: number): Promise<CmsPageBlockRow[]> {
    return db
      .select()
      .from(cmsPageBlocksTable)
      .where(eq(cmsPageBlocksTable.pageId, pageId))
      .orderBy(asc(cmsPageBlocksTable.position))
      .all();
  }

  async findPost(db: DbOrTx, path: string, includeDrafts: boolean): Promise<CmsPostRow | undefined> {
    const condition = includeDrafts
      ? eq(cmsPostsTable.path, path)
      : and(eq(cmsPostsTable.path, path), eq(cmsPostsTable.status, 'published'));
    return db.select().from(cmsPostsTable).where(condition).get();
  }

  async findMedia(db: DbOrTx, id: number): Promise<CmsMediaRow | undefined> {
    return db.select().from(cmsMediaTable).where(eq(cmsMediaTable.id, id)).get();
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

  async findRedirect(db: DbOrTx, path: string): Promise<CmsRedirectRow | undefined> {
    return db.select().from(cmsRedirectsTable).where(eq(cmsRedirectsTable.fromPath, path)).get();
  }

  /**
   * Incrémente le compteur d'usage d'une redirection.
   *
   * Appelé sans être attendu : le visiteur n'a pas à patienter pour une statistique,
   * et l'échec de ce comptage ne doit jamais transformer une redirection en erreur.
   */
  async countHit(db: DbOrTx, id: number): Promise<void> {
    await db
      .update(cmsRedirectsTable)
      .set({ hitCount: sql`${cmsRedirectsTable.hitCount} + 1` })
      .where(eq(cmsRedirectsTable.id, id))
      .run();
  }
}
