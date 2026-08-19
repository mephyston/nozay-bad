import { and, eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { championshipDaysTable, clubTeamsTable } from '../shared/schema';
import type { Championship } from '../shared/championship';

export async function findDaysByWeekStart(
  db: DbOrTx,
  seasonCode: string,
  weekStart: string
): Promise<
  Array<{ id: number; championship: Championship; number: number; label: string | null; weekStart: string }>
> {
  const rows = await db
    .select({
      id: championshipDaysTable.id,
      championship: championshipDaysTable.championship,
      number: championshipDaysTable.number,
      label: championshipDaysTable.label,
      weekStart: championshipDaysTable.weekStart
    })
    .from(championshipDaysTable)
    .where(
      and(
        eq(championshipDaysTable.seasonCode, seasonCode),
        eq(championshipDaysTable.weekStart, weekStart)
      )
    )
    .all();
  return rows as Array<{
    id: number;
    championship: Championship;
    number: number;
    label: string | null;
    weekStart: string;
  }>;
}

/** Championnats où le club aligne au moins une équipe active sur la saison. */
export async function findActiveChampionships(
  db: DbOrTx,
  seasonCode: string
): Promise<Set<Championship>> {
  const rows = await db
    .selectDistinct({ championship: clubTeamsTable.championship })
    .from(clubTeamsTable)
    .where(and(eq(clubTeamsTable.seasonCode, seasonCode), eq(clubTeamsTable.active, true)))
    .all();
  return new Set(rows.map((row) => row.championship as Championship));
}
