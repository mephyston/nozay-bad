import { desc, eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { announcementsTable } from '../shared/schema';

export class ListAnnouncementsRepository {
  async list(
    db: DbOrTx,
    filters: { status?: 'draft' | 'published'; limit: number; offset: number }
  ): Promise<(typeof announcementsTable.$inferSelect)[]> {
    const query = db
      .select()
      .from(announcementsTable)
      // `publishedAt` d'abord : un brouillon rédigé la semaine dernière puis publié
      // aujourd'hui doit passer devant. `createdAt` départage les brouillons, dont la
      // date de publication est nulle.
      .orderBy(desc(announcementsTable.publishedAt), desc(announcementsTable.createdAt))
      .limit(filters.limit)
      .offset(filters.offset);

    if (filters.status) return query.where(eq(announcementsTable.status, filters.status)).all();
    return query.all();
  }
}
