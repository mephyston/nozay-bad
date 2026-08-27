import { and, asc, eq, gte, inArray, lte, sql } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { venuesTable, type VenueRow } from '../../shared/schema';
import {
  openPlayGuestsTable,
  openPlayOpenersTable,
  openPlayRegistrationsTable,
  openPlaySessionsTable,
  type OpenPlaySessionRow
} from '../../shared/open-play-schema';
import type { GuestName } from '../register-to-open-play/dto';

export interface SessionTally {
  registrations: number;
  guests: number;
}

export class ListOpenPlaySessionsRepository {
  async list(
    db: DbOrTx,
    filters: { from?: string; to?: string; sessionIds?: number[] }
  ): Promise<OpenPlaySessionRow[]> {
    const where = [
      filters.from ? gte(openPlaySessionsTable.date, filters.from) : undefined,
      filters.to ? lte(openPlaySessionsTable.date, filters.to) : undefined,
      filters.sessionIds?.length ? inArray(openPlaySessionsTable.id, filters.sessionIds) : undefined
    ].filter(Boolean);

    return db
      .select()
      .from(openPlaySessionsTable)
      .where(where.length ? and(...where) : undefined)
      .orderBy(asc(openPlaySessionsTable.date), asc(openPlaySessionsTable.startTime))
      .all();
  }

  async venues(db: DbOrTx): Promise<VenueRow[]> {
    return db.select().from(venuesTable).all();
  }

  /**
   * Les compteurs de toutes les séances, en une requête.
   *
   * Agrégé en base plutôt que séance par séance : la liste en compte volontiers
   * cinquante, et un compte par ligne ferait cinquante allers-retours D1 pour deux
   * additions. Les séances sans inscrit n'ont pas de ligne ici — c'est au lecteur de
   * traiter l'absence comme un zéro.
   *
   * Le `distinct` porte tout le poids de la jointure : sans lui, une inscription à deux
   * invités compterait pour deux inscrits.
   */
  async tallies(db: DbOrTx): Promise<Map<number, SessionTally>> {
    const rows = await db
      .select({
        sessionId: openPlayRegistrationsTable.sessionId,
        registrations: sql<number>`count(distinct ${openPlayRegistrationsTable.id})`,
        guests: sql<number>`count(${openPlayGuestsTable.id})`
      })
      .from(openPlayRegistrationsTable)
      .leftJoin(
        openPlayGuestsTable,
        eq(openPlayGuestsTable.registrationId, openPlayRegistrationsTable.id)
      )
      .groupBy(openPlayRegistrationsTable.sessionId)
      .all();

    return new Map(
      rows.map((row) => [
        row.sessionId,
        { registrations: Number(row.registrations), guests: Number(row.guests) }
      ])
    );
  }

  /** Mes inscriptions : séance → invités annoncés. Une requête, quelle que soit la liste. */
  async registrationsOf(db: DbOrTx, memberId: number): Promise<Map<number, GuestName[]>> {
    const rows = await db
      .select({
        sessionId: openPlayRegistrationsTable.sessionId,
        firstName: openPlayGuestsTable.firstName,
        lastName: openPlayGuestsTable.lastName
      })
      .from(openPlayRegistrationsTable)
      .leftJoin(
        openPlayGuestsTable,
        eq(openPlayGuestsTable.registrationId, openPlayRegistrationsTable.id)
      )
      .where(eq(openPlayRegistrationsTable.memberId, memberId))
      .all();

    const bySession = new Map<number, GuestName[]>();
    for (const row of rows) {
      // La jointure externe rend une ligne même sans invité : c'est elle qui distingue
      // « inscrit et seul » (tableau vide) de « pas inscrit » (absence de clé).
      const guests = bySession.get(row.sessionId) ?? [];
      if (row.firstName && row.lastName) {
        guests.push({ firstName: row.firstName, lastName: row.lastName });
      }
      bySession.set(row.sessionId, guests);
    }
    return bySession;
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
}
