import { and, asc, eq, gte, isNotNull, lte, sql } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { venuesTable, type VenueRow } from '../../shared/schema';
import { indivRequestsTable, indivSessionsTable, type IndivSessionRow } from '../../shared/indiv-schema';
import type { MyIndivRequest } from './dto';

export interface SessionTally {
  requests: number;
  selected: number;
}

export class ListIndivSessionsRepository {
  async list(db: DbOrTx, filters: { from?: string; to?: string }): Promise<IndivSessionRow[]> {
    const where = [
      filters.from ? gte(indivSessionsTable.date, filters.from) : undefined,
      filters.to ? lte(indivSessionsTable.date, filters.to) : undefined
    ].filter(Boolean);

    return db
      .select()
      .from(indivSessionsTable)
      .where(where.length ? and(...where) : undefined)
      .orderBy(asc(indivSessionsTable.date), asc(indivSessionsTable.startTime))
      .all();
  }

  async venues(db: DbOrTx): Promise<VenueRow[]> {
    return db.select().from(venuesTable).all();
  }

  /** Candidats et retenus de toutes les soirées, en une requête agrégée. */
  async tallies(db: DbOrTx): Promise<Map<number, SessionTally>> {
    const rows = await db
      .select({
        sessionId: indivRequestsTable.sessionId,
        requests: sql<number>`count(*)`,
        selected: sql<number>`count(${indivRequestsTable.selectedSlot})`
      })
      .from(indivRequestsTable)
      .groupBy(indivRequestsTable.sessionId)
      .all();

    return new Map(rows.map((row) => [row.sessionId, { requests: Number(row.requests), selected: Number(row.selected) }]));
  }

  /** Mes candidatures : soirée → ce que j'ai demandé, et ce qu'on m'a répondu. */
  async requestsOf(db: DbOrTx, memberId: number): Promise<Map<number, MyIndivRequest>> {
    const rows = await db
      .select({
        sessionId: indivRequestsTable.sessionId,
        preferredSlot: indivRequestsTable.preferredSlot,
        note: indivRequestsTable.note,
        selectedSlot: indivRequestsTable.selectedSlot
      })
      .from(indivRequestsTable)
      .where(eq(indivRequestsTable.memberId, memberId))
      .all();

    return new Map(rows.map((row) => [row.sessionId, { preferredSlot: row.preferredSlot, note: row.note, selectedSlot: row.selectedSlot }]));
  }

  /**
   * Les retenus des soirées **annoncées** de la période, prénom et initiale, par créneau.
   *
   * Filtré par dates et non par identifiants : l'administration remonte trois cents
   * soirées, et D1 refuse plus de cent paramètres liés par requête.
   */
  async selectedNamesBetween(db: DbOrTx, from: string, to?: string): Promise<Map<number, Record<number, string[]>>> {
    const where = [
      eq(indivSessionsTable.status, 'announced'),
      isNotNull(indivRequestsTable.selectedSlot),
      gte(indivSessionsTable.date, from),
      to ? lte(indivSessionsTable.date, to) : undefined
    ].filter(Boolean);

    const rows = await db
      .select({
        sessionId: indivRequestsTable.sessionId,
        slot: indivRequestsTable.selectedSlot,
        firstName: indivRequestsTable.firstName,
        lastName: indivRequestsTable.lastName
      })
      .from(indivRequestsTable)
      .innerJoin(indivSessionsTable, eq(indivSessionsTable.id, indivRequestsTable.sessionId))
      .where(and(...where))
      .orderBy(asc(indivRequestsTable.selectedSlot), asc(indivRequestsTable.lastName))
      .all();

    const bySession = new Map<number, Record<number, string[]>>();
    for (const row of rows) {
      const slots = bySession.get(row.sessionId) ?? {};
      const slot = Number(row.slot);
      (slots[slot] ??= []).push(`${row.firstName} ${row.lastName.charAt(0)}.`.trim());
      bySession.set(row.sessionId, slots);
    }
    return bySession;
  }
}
