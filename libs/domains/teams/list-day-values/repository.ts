import { and, eq, inArray } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import {
  clubTeamsTable,
  championshipDaysTable,
  teamFixturesTable,
  lineupSlotsTable,
  type ClubTeamRow,
  type ChampionshipDayRow
} from '../shared/schema';
import { weeklyExclusionGroup } from '../shared/week';

export class ListDayValuesRepository {
  async findDay(
    db: DbOrTx,
    seasonCode: string,
    championship: ClubTeamRow['championship'],
    number: number
  ): Promise<ChampionshipDayRow | undefined> {
    return db
      .select()
      .from(championshipDaysTable)
      .where(
        and(
          eq(championshipDaysTable.seasonCode, seasonCode),
          eq(championshipDaysTable.championship, championship),
          eq(championshipDaysTable.number, number)
        )
      )
      .get();
  }

  async teamsOf(
    db: DbOrTx,
    seasonCode: string,
    championship: ClubTeamRow['championship']
  ): Promise<ClubTeamRow[]> {
    const rows = await db
      .select()
      .from(clubTeamsTable)
      .where(
        and(
          eq(clubTeamsTable.seasonCode, seasonCode),
          eq(clubTeamsTable.championship, championship)
        )
      )
      .all();
    return rows.sort((a, b) => a.number - b.number);
  }

  /**
   * Qui joue pour quelle équipe du club sur cette **semaine théorique**, tous
   * championnats du groupe d'exclusion confondus.
   *
   * C'est la seule vue que personne d'autre ne peut avoir : un capitaine ne voit que sa
   * propre composition, et l'infraction — un joueur aligné deux fois — fait perdre la
   * rencontre à toutes les équipes concernées.
   */
  async alignmentsInWeek(
    db: DbOrTx,
    seasonCode: string,
    championship: ClubTeamRow['championship'],
    weekStart: string
  ): Promise<Array<{ licence: string; team: ClubTeamRow }>> {
    const group = weeklyExclusionGroup(championship) as readonly ClubTeamRow['championship'][];

    const teams = await db
      .select()
      .from(clubTeamsTable)
      .where(
        and(
          eq(clubTeamsTable.seasonCode, seasonCode),
          inArray(clubTeamsTable.championship, [...group])
        )
      )
      .all();
    if (teams.length === 0) return [];

    const byId = new Map(teams.map((t) => [t.id, t]));
    const days = await db
      .select()
      .from(championshipDaysTable)
      .where(eq(championshipDaysTable.seasonCode, seasonCode))
      .all();
    const weekByDay = new Map(days.map((d) => [d.id, d.weekStart]));

    const fixtures = (
      await db
        .select()
        .from(teamFixturesTable)
        .where(inArray(teamFixturesTable.teamId, [...byId.keys()]))
        .all()
    ).filter((f) => weekByDay.get(f.dayId) === weekStart);

    if (fixtures.length === 0) return [];

    const slots = await db
      .select()
      .from(lineupSlotsTable)
      .where(inArray(lineupSlotsTable.fixtureId, fixtures.map((f) => f.id)))
      .all();

    const fixtureTeam = new Map(fixtures.map((f) => [f.id, byId.get(f.teamId)!]));
    const alignments: Array<{ licence: string; team: ClubTeamRow }> = [];
    for (const slot of slots) {
      const team = fixtureTeam.get(slot.fixtureId);
      if (!team) continue;
      alignments.push({ licence: slot.licence1, team });
      if (slot.licence2) alignments.push({ licence: slot.licence2, team });
    }
    return alignments;
  }
}
