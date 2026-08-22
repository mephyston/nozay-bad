import { and, eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { venuesTable, type VenueRow } from '../../shared/schema';
import {
  openPlayOpenersTable,
  openPlaySessionsTable,
  type OpenPlaySessionRow
} from '../../shared/open-play-schema';

export class UpdateOpenPlaySessionRepository {
  async findSession(db: DbOrTx, id: number): Promise<OpenPlaySessionRow | undefined> {
    return db.select().from(openPlaySessionsTable).where(eq(openPlaySessionsTable.id, id)).get();
  }

  async findVenue(db: DbOrTx, id: number): Promise<VenueRow | undefined> {
    return db.select().from(venuesTable).where(eq(venuesTable.id, id)).get();
  }

  async isOpener(db: DbOrTx, seasonCode: string, licence: string): Promise<boolean> {
    const row = await db
      .select({ id: openPlayOpenersTable.id })
      .from(openPlayOpenersTable)
      .where(
        and(
          eq(openPlayOpenersTable.seasonCode, seasonCode),
          eq(openPlayOpenersTable.licence, licence)
        )
      )
      .get();
    return Boolean(row);
  }

  async update(
    db: DbOrTx,
    id: number,
    values: Partial<typeof openPlaySessionsTable.$inferInsert>
  ): Promise<OpenPlaySessionRow> {
    const [row] = await db
      .update(openPlaySessionsTable)
      .set(values)
      .where(eq(openPlaySessionsTable.id, id))
      .returning();
    return row;
  }
}
