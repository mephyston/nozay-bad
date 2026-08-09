import { asc, eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { scheduleSlotsTable, venuesTable, type ScheduleSlotRow, type VenueRow } from '../shared/schema';

export class ListScheduleSlotsRepository {
  async list(db: DbOrTx): Promise<ScheduleSlotRow[]> {
    // Tri par jour puis par heure : c'est l'ordre du tableau affiché, autant le faire
    // faire à l'index plutôt qu'en mémoire.
    return db
      .select()
      .from(scheduleSlotsTable)
      .orderBy(asc(scheduleSlotsTable.weekday), asc(scheduleSlotsTable.startTime))
      .all();
  }

  async venues(db: DbOrTx): Promise<VenueRow[]> {
    return db.select().from(venuesTable).orderBy(asc(venuesTable.name)).all();
  }
}
