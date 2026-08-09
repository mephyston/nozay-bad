import { eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { scheduleSlotsTable, venuesTable, type ScheduleSlotRow, type VenueRow } from '../shared/schema';

export class CreateScheduleSlotRepository {
  async findVenue(db: DbOrTx, id: number): Promise<VenueRow | undefined> {
    return db.select().from(venuesTable).where(eq(venuesTable.id, id)).get();
  }
  async insert(db: DbOrTx, values: typeof scheduleSlotsTable.$inferInsert): Promise<ScheduleSlotRow> {
    const [row] = await db.insert(scheduleSlotsTable).values(values).returning();
    return row;
  }
}
