import { eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { clubEventsTable, type ClubEventRow } from '../shared/schema';

export class UpdateEventRepository {
  async findById(db: DbOrTx, id: number): Promise<ClubEventRow | undefined> {
    return db.select().from(clubEventsTable).where(eq(clubEventsTable.id, id)).get();
  }
  async update(db: DbOrTx, id: number, values: Partial<typeof clubEventsTable.$inferInsert>): Promise<ClubEventRow> {
    const [row] = await db.update(clubEventsTable).set(values).where(eq(clubEventsTable.id, id)).returning();
    return row;
  }
}
