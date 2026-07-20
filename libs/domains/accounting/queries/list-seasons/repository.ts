import { desc } from 'drizzle-orm';
import { seasonsTable } from '@metacult/features-members-data-access';

export class ListSeasonsRepository {
  async listSeasons(db: any): Promise<any[]> {
    return db.select().from(seasonsTable).orderBy(desc(seasonsTable.id)).all();
  }
}
