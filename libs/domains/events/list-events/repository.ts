import { asc } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { clubEventsTable, type ClubEventRow } from '../shared/schema';

export class ListEventsRepository {
  async list(db: DbOrTx): Promise<ClubEventRow[]> {
    return db.select().from(clubEventsTable).orderBy(asc(clubEventsTable.startsAt)).all();
  }
}
