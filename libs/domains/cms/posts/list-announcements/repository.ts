import { and, desc, eq, isNotNull } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { cmsPostsTable } from '../../shared/schema';
import type { AnnouncementPost, ListAnnouncementsInput } from './dto';

export class ListAnnouncementsRepository {
  /**
   * Les seules actualités qui annoncent un rendez-vous, et rien d'autre d'elles.
   *
   * Trois différences avec `list-posts`, et chacune retire du travail : la projection
   * laisse le corps des articles en base, `event_id IS NOT NULL` écarte en SQL ce que
   * l'appelant filtrait ensuite en mémoire, et le `LIMIT` est appliqué par SQLite —
   * `list-posts`, lui, charge tout puis découpe.
   */
  async list(
    db: DbOrTx,
    filters: ListAnnouncementsInput & { limit: number }
  ): Promise<AnnouncementPost[]> {
    const conditions = [
      eq(cmsPostsTable.status, 'published'),
      isNotNull(cmsPostsTable.eventId)
    ];
    if (filters.visibility) conditions.push(eq(cmsPostsTable.visibility, filters.visibility));

    const rows = await db
      .select({
        id: cmsPostsTable.id,
        slug: cmsPostsTable.slug,
        path: cmsPostsTable.path,
        title: cmsPostsTable.title,
        eventId: cmsPostsTable.eventId
      })
      .from(cmsPostsTable)
      .where(and(...conditions))
      // Même ordre que la liste complète : la plus récente l'emporte quand deux
      // actualités annoncent le même rendez-vous.
      .orderBy(desc(cmsPostsTable.publishedAt), desc(cmsPostsTable.createdAt))
      .limit(filters.limit)
      .all();

    return rows.filter((row): row is AnnouncementPost => row.eventId !== null);
  }
}
