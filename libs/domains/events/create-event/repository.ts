import { eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { clubEventsTable, type ClubEventRow } from '../shared/schema';

export class CreateEventRepository {
  async findBySlug(db: DbOrTx, slug: string): Promise<ClubEventRow | undefined> {
    return db.select().from(clubEventsTable).where(eq(clubEventsTable.slug, slug)).get();
  }
  async insert(db: DbOrTx, values: typeof clubEventsTable.$inferInsert): Promise<ClubEventRow> {
    const [row] = await db.insert(clubEventsTable).values(values).returning();
    return row;
  }
}
