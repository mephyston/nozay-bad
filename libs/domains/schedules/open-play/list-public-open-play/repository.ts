import { and, asc, eq, gte, inArray, lte, sql } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { venuesTable } from '../../shared/schema';
import {
  openPlayGuestsTable,
  openPlayRegistrationsTable,
  openPlaySessionsTable
} from '../../shared/open-play-schema';

export interface PublicSessionRow {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  label: string | null;
  status: 'open' | 'confirmed' | 'cancelled';
  minPlayers: number;
  openerFirstName: string | null;
  openerLastName: string | null;
  venueName: string | null;
}

export class ListPublicOpenPlayRepository {
  /**
   * Les prochaines séances, gymnase joint.
   *
   * La projection est explicite, comme celle des inscrits : ni `opener_licence`, ni
   * `notes`, ni `cancelled_reason` ne sortent d'ici.
   */
  async upcoming(db: DbOrTx, from: string, to: string | undefined, limit: number): Promise<PublicSessionRow[]> {
    return db
      .select({
        id: openPlaySessionsTable.id,
        date: openPlaySessionsTable.date,
        startTime: openPlaySessionsTable.startTime,
        endTime: openPlaySessionsTable.endTime,
        label: openPlaySessionsTable.label,
        status: openPlaySessionsTable.status,
        minPlayers: openPlaySessionsTable.minPlayers,
        openerFirstName: openPlaySessionsTable.openerFirstName,
        openerLastName: openPlaySessionsTable.openerLastName,
        venueName: venuesTable.name
      })
      .from(openPlaySessionsTable)
      .leftJoin(venuesTable, eq(venuesTable.id, openPlaySessionsTable.venueId))
      .where(
        and(
          gte(openPlaySessionsTable.date, from),
          to ? lte(openPlaySessionsTable.date, to) : undefined
        )
      )
      .orderBy(asc(openPlaySessionsTable.date), asc(openPlaySessionsTable.startTime))
      .limit(limit)
      .all();
  }

  /** Les inscrits des séances retenues, prénom et nom seulement, en une requête. */
  async players(
    db: DbOrTx,
    sessionIds: number[]
  ): Promise<{ sessionId: number; firstName: string; lastName: string }[]> {
    if (sessionIds.length === 0) return [];
    return db
      .select({
        sessionId: openPlayRegistrationsTable.sessionId,
        firstName: openPlayRegistrationsTable.firstName,
        lastName: openPlayRegistrationsTable.lastName
      })
      .from(openPlayRegistrationsTable)
      .where(inArray(openPlayRegistrationsTable.sessionId, sessionIds))
      .orderBy(asc(openPlayRegistrationsTable.createdAt), asc(openPlayRegistrationsTable.id))
      .all();
  }

  /** Le nombre d'invités par séance. Une séance sans invité n'a pas de ligne. */
  async guestCounts(db: DbOrTx, sessionIds: number[]): Promise<Map<number, number>> {
    if (sessionIds.length === 0) return new Map();
    const rows = await db
      .select({
        sessionId: openPlayRegistrationsTable.sessionId,
        guests: sql<number>`count(${openPlayGuestsTable.id})`
      })
      .from(openPlayGuestsTable)
      .innerJoin(
        openPlayRegistrationsTable,
        eq(openPlayRegistrationsTable.id, openPlayGuestsTable.registrationId)
      )
      .where(inArray(openPlayRegistrationsTable.sessionId, sessionIds))
      .groupBy(openPlayRegistrationsTable.sessionId)
      .all();
    return new Map(rows.map((row) => [row.sessionId, Number(row.guests)]));
  }
}
