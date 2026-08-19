import { asc } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { venuesTable, type VenueRow } from '../shared/schema';

export class ListVenuesRepository {
  async list(db: DbOrTx): Promise<VenueRow[]> {
    return db.select().from(venuesTable).orderBy(asc(venuesTable.name)).all();
  }
}
