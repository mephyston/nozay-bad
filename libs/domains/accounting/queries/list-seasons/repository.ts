import { type DbOrTx } from '@metacult/shared-db';
import { desc } from 'drizzle-orm';
import { seasonsTable } from '../../shared/schema';

export class ListSeasonsRepository {
  async listSeasons(db: DbOrTx): Promise<any[]> {
    return db.select().from(seasonsTable).orderBy(desc(seasonsTable.id)).all();
  }
}
