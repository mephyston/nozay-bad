import { asc, eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import {
  openPlayGuestsTable,
  openPlayRegistrationsTable,
  openPlaySessionsTable,
  type OpenPlaySessionRow
} from '../../shared/open-play-schema';
import type { GuestName } from '../register-to-open-play/dto';

export class ListOpenPlayAttendeesRepository {
  async findSession(db: DbOrTx, id: number): Promise<OpenPlaySessionRow | undefined> {
    return db.select().from(openPlaySessionsTable).where(eq(openPlaySessionsTable.id, id)).get();
  }

  /**
   * Les inscrits d'une séance, **prénom et nom seulement**.
   *
   * La projection est explicite et non un `select()` complet : c'est elle qui garantit
   * que ni la licence, ni l'adresse, ni l'identifiant d'adhésion ne sortent d'ici. Un
   * `select()` les emporterait tous, et personne ne s'en apercevrait avant qu'ils
   * n'apparaissent dans une réponse HTTP.
   */
  async listFor(
    db: DbOrTx,
    sessionId: number
  ): Promise<{ id: number; firstName: string; lastName: string }[]> {
    return db
      .select({
        id: openPlayRegistrationsTable.id,
        firstName: openPlayRegistrationsTable.firstName,
        lastName: openPlayRegistrationsTable.lastName
      })
      .from(openPlayRegistrationsTable)
      .where(eq(openPlayRegistrationsTable.sessionId, sessionId))
      .orderBy(asc(openPlayRegistrationsTable.lastName), asc(openPlayRegistrationsTable.firstName))
      .all();
  }

  /** Les invités de la séance, groupés par hôte. Une requête, quel que soit le monde. */
  async guestsFor(db: DbOrTx, sessionId: number): Promise<Map<number, GuestName[]>> {
    const rows = await db
      .select({
        registrationId: openPlayGuestsTable.registrationId,
        firstName: openPlayGuestsTable.firstName,
        lastName: openPlayGuestsTable.lastName
      })
      .from(openPlayGuestsTable)
      .innerJoin(
        openPlayRegistrationsTable,
        eq(openPlayRegistrationsTable.id, openPlayGuestsTable.registrationId)
      )
      .where(eq(openPlayRegistrationsTable.sessionId, sessionId))
      .orderBy(asc(openPlayGuestsTable.lastName), asc(openPlayGuestsTable.firstName))
      .all();

    const byRegistration = new Map<number, GuestName[]>();
    for (const row of rows) {
      const guests = byRegistration.get(row.registrationId) ?? [];
      guests.push({ firstName: row.firstName, lastName: row.lastName });
      byRegistration.set(row.registrationId, guests);
    }
    return byRegistration;
  }
}
