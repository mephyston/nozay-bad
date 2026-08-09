import { eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { scheduleSlotsTable, type ScheduleSlotRow } from '../shared/schema';

export class DeleteScheduleSlotRepository {
  async findById(db: DbOrTx, id: number): Promise<ScheduleSlotRow | undefined> {
    return db.select().from(scheduleSlotsTable).where(eq(scheduleSlotsTable.id, id)).get();
  }
  async remove(db: DbOrTx, id: number): Promise<void> {
    await db.delete(scheduleSlotsTable).where(eq(scheduleSlotsTable.id, id)).run();
  }
}
