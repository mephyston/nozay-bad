import { seasonsTable } from '@nba/accounting/schema';
import { type DbOrTx } from '@nba/db';
import { desc } from 'drizzle-orm';


export class ListSeasonsRepository {
  async listSeasons(db: DbOrTx): Promise<any[]> {
    return db.select().from(seasonsTable).orderBy(desc(seasonsTable.id)).all();
  }
}
