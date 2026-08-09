import { eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { scheduleSlotsTable, type ScheduleSlotRow } from '../shared/schema';

export class UpdateScheduleSlotRepository {
  async findById(db: DbOrTx, id: number): Promise<ScheduleSlotRow | undefined> {
    return db.select().from(scheduleSlotsTable).where(eq(scheduleSlotsTable.id, id)).get();
  }
  async update(db: DbOrTx, id: number, values: Partial<typeof scheduleSlotsTable.$inferInsert>): Promise<ScheduleSlotRow> {
    const [row] = await db.update(scheduleSlotsTable).set(values).where(eq(scheduleSlotsTable.id, id)).returning();
    return row;
  }
}
