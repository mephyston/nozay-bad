import { asc, eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import {
  clubEventsTable,
  clubEventRegistrationsTable,
  type ClubEventRow,
  type ClubEventRegistrationRow
} from '../shared/schema';

export class ListEventRegistrationsRepository {
  async findEvent(db: DbOrTx, id: number): Promise<ClubEventRow | undefined> {
    return db.select().from(clubEventsTable).where(eq(clubEventsTable.id, id)).get();
  }

  /** Triées par nom : c'est une liste d'appel, pas un journal d'inscriptions. */
  async listFor(db: DbOrTx, eventId: number): Promise<ClubEventRegistrationRow[]> {
    return db
      .select()
      .from(clubEventRegistrationsTable)
      .where(eq(clubEventRegistrationsTable.eventId, eventId))
      .orderBy(asc(clubEventRegistrationsTable.lastName), asc(clubEventRegistrationsTable.firstName))
      .all();
  }
}
