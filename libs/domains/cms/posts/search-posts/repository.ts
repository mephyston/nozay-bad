import { and, desc, eq, isNotNull } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { cmsPostsTable } from '../../shared/schema';

/** Ce qu'une recherche a besoin de lire d'un article : jamais le corps. */
export interface SearchablePost {
  id: number;
  slug: string;
  /** Chemin sur le site public (`/actualites/<slug>/`). */
  path: string;
  title: string;
  excerpt: string | null;
  visibility: 'public' | 'private';
  publishedAt: Date | null;
}

export class SearchPostsRepository {
  /**
   * Les articles publiés, du plus récent au plus ancien, sans leur corps.
   *
   * Tous : c'est l'appelant qui filtre, sans accents, en mémoire. Quelques centaines
   * de titres et chapôs pèsent moins qu'un `LIKE` qui ne saurait pas lire « chèque »
   * dans « cheque ».
   */
  async listPublished(db: DbOrTx, limit: number): Promise<SearchablePost[]> {
    return db
      .select({
        id: cmsPostsTable.id,
        slug: cmsPostsTable.slug,
        path: cmsPostsTable.path,
        title: cmsPostsTable.title,
        excerpt: cmsPostsTable.excerpt,
        visibility: cmsPostsTable.visibility,
        publishedAt: cmsPostsTable.publishedAt
      })
      .from(cmsPostsTable)
      .where(and(eq(cmsPostsTable.status, 'published'), isNotNull(cmsPostsTable.publishedAt)))
      .orderBy(desc(cmsPostsTable.publishedAt))
      .limit(limit)
      .all();
  }
}
