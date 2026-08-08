import { and, asc, eq, sql } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import {
  cmsPagesTable,
  cmsPageBlocksTable,
  cmsPostsTable,
  cmsRedirectsTable,
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
