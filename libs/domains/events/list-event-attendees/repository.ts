import { asc, eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { clubEventsTable, clubEventRegistrationsTable, type ClubEventRow } from '../shared/schema';

export class ListEventAttendeesRepository {
  async findEvent(db: DbOrTx, id: number): Promise<ClubEventRow | undefined> {
    return db.select().from(clubEventsTable).where(eq(clubEventsTable.id, id)).get();
  }

  /**
   * Les inscrits d'un rendez-vous, **prénom, nom et nombre d'accompagnants seulement**.
   *
   * La projection est explicite et non un `select()` complet : c'est elle qui garantit que
   * ni l'adresse électronique, ni l'identifiant d'adhésion ne sortent d'ici — la liste du
   * bureau (`list-event-registrations`) les porte, celle-ci non.
   */
  async listFor(db: DbOrTx, eventId: number): Promise<{ firstName: string; lastName: string; guests: number }[]> {
    return db
      .select({
        firstName: clubEventRegistrationsTable.firstName,
        lastName: clubEventRegistrationsTable.lastName,
        guests: clubEventRegistrationsTable.guests
      })
      .from(clubEventRegistrationsTable)
      .where(eq(clubEventRegistrationsTable.eventId, eventId))
      .orderBy(asc(clubEventRegistrationsTable.lastName), asc(clubEventRegistrationsTable.firstName))
      .all();
  }
}
