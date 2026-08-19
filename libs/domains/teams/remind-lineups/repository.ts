import { and, eq, gte, inArray } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import {
  championshipDaysTable,
  clubTeamsTable,
  lineupSlotsTable,
  teamFixturesTable,
  teamStaffTable
} from '../shared/schema';
import type { Championship } from '../shared/championship';

export interface ReminderTeam {
  id: number;
  championship: Championship;
  number: number;
}

export interface ReminderDay {
  id: number;
  championship: Championship;
  number: number;
  label: string | null;
  kind: 'regular' | 'playoff';
  weekStart: string;
  weekEnd: string;
  matchDate: string | null;
}

export interface ReminderFixture {
  id: number;
  teamId: number;
  dayId: number;
  slot: number;
  status: 'scheduled' | 'bye' | 'forfeit';
  playedAt: string | null;
}

export async function findActiveTeams(db: DbOrTx, seasonCode: string): Promise<ReminderTeam[]> {
  const rows = await db
    .select({
      id: clubTeamsTable.id,
      championship: clubTeamsTable.championship,
      number: clubTeamsTable.number
    })
    .from(clubTeamsTable)
    .where(and(eq(clubTeamsTable.seasonCode, seasonCode), eq(clubTeamsTable.active, true)))
    .all();
  return rows as ReminderTeam[];
}

/** Journées non terminées de la saison (la fenêtre fine est jugée en mémoire). */
export async function findUpcomingDays(
  db: DbOrTx,
  seasonCode: string,
  todayIso: string
): Promise<ReminderDay[]> {
  const rows = await db
    .select({
      id: championshipDaysTable.id,
      championship: championshipDaysTable.championship,
      number: championshipDaysTable.number,
      label: championshipDaysTable.label,
      kind: championshipDaysTable.kind,
      weekStart: championshipDaysTable.weekStart,
      weekEnd: championshipDaysTable.weekEnd,
      matchDate: championshipDaysTable.matchDate
    })
    .from(championshipDaysTable)
    .where(
      and(
        eq(championshipDaysTable.seasonCode, seasonCode),
        gte(championshipDaysTable.weekEnd, todayIso)
      )
    )
    .all();
  return rows as ReminderDay[];
}

export async function findFixtures(
  db: DbOrTx,
  teamIds: number[],
  dayIds: number[]
): Promise<ReminderFixture[]> {
  if (teamIds.length === 0 || dayIds.length === 0) return [];
  const rows = await db
    .select({
      id: teamFixturesTable.id,
      teamId: teamFixturesTable.teamId,
      dayId: teamFixturesTable.dayId,
      slot: teamFixturesTable.slot,
      status: teamFixturesTable.status,
      playedAt: teamFixturesTable.playedAt
    })
    .from(teamFixturesTable)
    .where(and(inArray(teamFixturesTable.teamId, teamIds), inArray(teamFixturesTable.dayId, dayIds)))
    .all();
  return rows as ReminderFixture[];
}

/** Identifiants des rencontres ayant au moins une ligne validée. */
export async function findValidatedFixtureIds(
  db: DbOrTx,
  fixtureIds: number[]
): Promise<Set<number>> {
  if (fixtureIds.length === 0) return new Set();
  const rows = await db
    .selectDistinct({ fixtureId: lineupSlotsTable.fixtureId })
    .from(lineupSlotsTable)
    .where(
      and(inArray(lineupSlotsTable.fixtureId, fixtureIds), eq(lineupSlotsTable.status, 'validated'))
    )
    .all();
  return new Set(rows.map((row) => row.fixtureId));
}

/** Staff (capitaine, vice) de chaque équipe, en une requête. */
export async function findStaffLicences(
  db: DbOrTx,
  teamIds: number[]
): Promise<Map<number, string[]>> {
  if (teamIds.length === 0) return new Map();
  const rows = await db
    .select({ teamId: teamStaffTable.teamId, licence: teamStaffTable.licence })
    .from(teamStaffTable)
    .where(inArray(teamStaffTable.teamId, teamIds))
    .all();
  const byTeam = new Map<number, string[]>();
  for (const row of rows) {
    const list = byTeam.get(row.teamId) ?? [];
    list.push(row.licence);
    byTeam.set(row.teamId, list);
  }
  return byTeam;
}
