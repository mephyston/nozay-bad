import { asc, eq, sql } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { clubEventsTable, clubEventRegistrationsTable, type ClubEventRow } from '../shared/schema';

export interface RegistrationTally {
  registrations: number;
  guests: number;
}

export class ListEventsRepository {
  async list(db: DbOrTx): Promise<ClubEventRow[]> {
    return db.select().from(clubEventsTable).orderBy(asc(clubEventsTable.startsAt)).all();
  }

  /**
   * Les compteurs de tous les événements en une seule requête.
   *
   * Agrégé en base plutôt qu'événement par événement : la liste en compte volontiers
   * cinquante, et un compte par ligne ferait cinquante allers-retours D1 pour deux
   * additions. Les événements sans inscrit n'ont pas de ligne ici — c'est au lecteur de
   * traiter l'absence comme un zéro.
   */
  async tallies(db: DbOrTx): Promise<Map<number, RegistrationTally>> {
    const rows = await db
      .select({
        eventId: clubEventRegistrationsTable.eventId,
        registrations: sql<number>`count(*)`,
        guests: sql<number>`coalesce(sum(${clubEventRegistrationsTable.guests}), 0)`
      })
      .from(clubEventRegistrationsTable)
      .groupBy(clubEventRegistrationsTable.eventId)
      .all();

    return new Map(
      rows.map((row) => [
        row.eventId,
        { registrations: Number(row.registrations), guests: Number(row.guests) }
      ])
    );
  }

  /** Les inscriptions d'un adhérent : événement → accompagnants annoncés. */
  async registrationsOf(db: DbOrTx, memberId: number): Promise<Map<number, number>> {
    const rows = await db
      .select({
        eventId: clubEventRegistrationsTable.eventId,
        guests: clubEventRegistrationsTable.guests
      })
      .from(clubEventRegistrationsTable)
      .where(eq(clubEventRegistrationsTable.memberId, memberId))
      .all();

    return new Map(rows.map((row) => [row.eventId, row.guests]));
  }
}
