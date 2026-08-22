import { asc, eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import {
  openPlayGuestsTable,
  openPlayRegistrationsTable,
  openPlaySessionsTable,
  type OpenPlayRegistrationRow,
  type OpenPlaySessionRow
} from '../../shared/open-play-schema';
import type { GuestName } from '../register-to-open-play/dto';

export class ListOpenPlayRegistrationsRepository {
  async findSession(db: DbOrTx, id: number): Promise<OpenPlaySessionRow | undefined> {
    return db.select().from(openPlaySessionsTable).where(eq(openPlaySessionsTable.id, id)).get();
  }

  /**
   * Trié par nom de famille : c'est une liste d'appel, pas un journal d'inscriptions.
   * Le bénévole à la porte cherche un nom, il ne cherche pas qui s'est inscrit en premier.
   */
  async listFor(db: DbOrTx, sessionId: number): Promise<OpenPlayRegistrationRow[]> {
    return db
      .select()
      .from(openPlayRegistrationsTable)
      .where(eq(openPlayRegistrationsTable.sessionId, sessionId))
      .orderBy(asc(openPlayRegistrationsTable.lastName), asc(openPlayRegistrationsTable.firstName))
      .all();
  }

  /** Les invités de la séance, groupés par inscription — une requête, pas une par inscrit. */
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
