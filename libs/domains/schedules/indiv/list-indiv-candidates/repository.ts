import { and, asc, eq, gte, lte, sql } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { venuesTable } from '../../shared/schema';
import {
  indivRequestsTable,
  indivSessionsTable,
  type IndivRequestRow,
  type IndivSessionRow
} from '../../shared/indiv-schema';

export interface LicenceStats {
  requests: number;
  selected: number;
  lastSelectedDate: string | null;
}

export class ListIndivCandidatesRepository {
  async findSession(db: DbOrTx, id: number): Promise<IndivSessionRow | undefined> {
    return db.select().from(indivSessionsTable).where(eq(indivSessionsTable.id, id)).get();
  }

  async venueName(db: DbOrTx, venueId: number): Promise<string | null> {
    const row = await db.select({ name: venuesTable.name }).from(venuesTable).where(eq(venuesTable.id, venueId)).get();
    return row?.name ?? null;
  }

  async requestsOf(db: DbOrTx, sessionId: number): Promise<IndivRequestRow[]> {
    return db
      .select()
      .from(indivRequestsTable)
      .where(eq(indivRequestsTable.sessionId, sessionId))
      .orderBy(asc(indivRequestsTable.createdAt), asc(indivRequestsTable.id))
      .all();
  }

  /**
   * Ce que la saison dit de chaque licence, en une requête.
   *
   * « Retenu » ne compte que sur les soirées **annoncées** : une sélection non annoncée
   * n'a pas eu lieu, et une soirée annulée après annonce non plus. Les demandes, elles,
   * se comptent sur toutes les soirées non annulées — c'est le zèle du candidat.
   */
  async seasonStats(db: DbOrTx, range: { from: string; to: string }): Promise<Map<string, LicenceStats>> {
    const announcedSelection = sql<number>`case when ${indivSessionsTable.status} = 'announced' and ${indivRequestsTable.selectedSlot} is not null then 1 else 0 end`;
    const rows = await db
      .select({
        licence: indivRequestsTable.licence,
        requests: sql<number>`sum(case when ${indivSessionsTable.status} <> 'cancelled' then 1 else 0 end)`,
        selected: sql<number>`sum(${announcedSelection})`,
        lastSelectedDate: sql<string | null>`max(case when ${announcedSelection} = 1 then ${indivSessionsTable.date} else null end)`
      })
      .from(indivRequestsTable)
      .innerJoin(indivSessionsTable, eq(indivSessionsTable.id, indivRequestsTable.sessionId))
      .where(and(gte(indivSessionsTable.date, range.from), lte(indivSessionsTable.date, range.to)))
      .groupBy(indivRequestsTable.licence)
      .all();

    return new Map(
      rows.map((row) => [
        row.licence,
        { requests: Number(row.requests ?? 0), selected: Number(row.selected ?? 0), lastSelectedDate: row.lastSelectedDate ?? null }
      ])
    );
  }
}
