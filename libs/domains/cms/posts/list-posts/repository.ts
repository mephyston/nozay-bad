import { and, desc, eq, inArray, type SQL } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import {
  cmsPostsTable, cmsPostCategoriesTable, cmsPostCategoryLinksTable, type CmsPostRow
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
    filters: { status?: 'draft' | 'published'; ids?: number[]; limit: number; offset: number }
  ): Promise<{ rows: CmsPostRow[]; total: number }> {
    const conditions: SQL[] = [];
    if (filters.status) conditions.push(eq(cmsPostsTable.status, filters.status));
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
}
