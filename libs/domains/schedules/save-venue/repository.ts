import { eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { venuesTable, type VenueRow } from '../shared/schema';

export class SaveVenueRepository {
  async findByCode(db: DbOrTx, code: string): Promise<VenueRow | undefined> {
    return db.select().from(venuesTable).where(eq(venuesTable.code, code)).get();
  }
  async insert(db: DbOrTx, values: typeof venuesTable.$inferInsert): Promise<VenueRow> {
    const [row] = await db.insert(venuesTable).values(values).returning();
    return row;
  }
  async update(db: DbOrTx, id: number, values: Partial<typeof venuesTable.$inferInsert>): Promise<VenueRow> {
    const [row] = await db.update(venuesTable).set(values).where(eq(venuesTable.id, id)).returning();
    return row;
  }
}
