import { and, desc, eq, inArray, type SQL } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import {
  cmsPostsTable, cmsPostCategoriesTable, cmsPostCategoryLinksTable, cmsMediaTable,
  type CmsPostRow, type CmsPostCategoryRow, type CmsMediaRow
} from '../../shared/schema';

export class ListPostsRepository {
  /** Identifiants des articles d'une catégorie, ou `null` si la catégorie est inconnue. */
  async postIdsInCategory(db: DbOrTx, slug: string): Promise<number[] | null> {
    const category = await db
      .select()
      .from(cmsPostCategoriesTable)
      .where(eq(cmsPostCategoriesTable.slug, slug))
      .get();
    if (!category) return null;

    const links = await db
      .select()
      .from(cmsPostCategoryLinksTable)
      .where(eq(cmsPostCategoryLinksTable.categoryId, category.id))
      .all();
    return links.map((link) => link.postId);
  }

  async list(
    db: DbOrTx,
    filters: {
      status?: 'draft' | 'published';
      visibility?: 'public' | 'private';
      ids?: number[];
      limit: number;
      offset: number;
    }
  ): Promise<{ rows: CmsPostRow[]; total: number }> {
    const conditions: SQL[] = [];
    if (filters.status) conditions.push(eq(cmsPostsTable.status, filters.status));
    if (filters.visibility) conditions.push(eq(cmsPostsTable.visibility, filters.visibility));
    // Une catégorie sans article donne une liste vide, jamais la liste complète.
    if (filters.ids) {
      if (filters.ids.length === 0) return { rows: [], total: 0 };
      conditions.push(inArray(cmsPostsTable.id, filters.ids));
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    // `publishedAt` d'abord : un brouillon rédigé la semaine dernière puis publié
    // aujourd'hui doit passer devant. `createdAt` départage les brouillons.
    const base = db
      .select()
      .from(cmsPostsTable)
      .orderBy(desc(cmsPostsTable.publishedAt), desc(cmsPostsTable.createdAt));

    const all = where ? await base.where(where).all() : await base.all();
    return { rows: all.slice(filters.offset, filters.offset + filters.limit), total: all.length };
  }

  /**
   * Couvertures des articles affichés, en une requête.
   *
   * Chargées en lot et non article par article : l'accueil en demande six, la page
   * d'archives douze, et autant d'allers-retours D1 se paieraient sur chaque rendu.
   */
  async coversFor(db: DbOrTx, mediaIds: number[]): Promise<Map<number, CmsMediaRow>> {
    if (mediaIds.length === 0) return new Map();
    const rows = await db
      .select()
      .from(cmsMediaTable)
      .where(inArray(cmsMediaTable.id, mediaIds))
      .all();
    return new Map(rows.map((row) => [row.id, row]));
  }

  /** Catégories des articles affichés, en une requête, indexées par article. */
  async categoriesFor(db: DbOrTx, postIds: number[]): Promise<Map<number, CmsPostCategoryRow[]>> {
    const byPost = new Map<number, CmsPostCategoryRow[]>();
    if (postIds.length === 0) return byPost;

    const links = await db
      .select()
      .from(cmsPostCategoryLinksTable)
      .where(inArray(cmsPostCategoryLinksTable.postId, postIds))
      .all();
    if (links.length === 0) return byPost;

    const categories = await db
      .select()
      .from(cmsPostCategoriesTable)
      .where(inArray(cmsPostCategoriesTable.id, [...new Set(links.map((l) => l.categoryId))]))
      .all();
    const byId = new Map(categories.map((c) => [c.id, c]));

    for (const link of links) {
      const category = byId.get(link.categoryId);
      if (!category) continue;
      const list = byPost.get(link.postId);
      if (list) list.push(category);
      else byPost.set(link.postId, [category]);
    }
    return byPost;
  }
}
