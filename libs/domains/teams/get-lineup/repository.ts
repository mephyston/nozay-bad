import { and, eq, inArray, lte, ne } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import {
  clubTeamsTable,
  championshipDaysTable,
  teamFixturesTable,
  lineupSlotsTable,
  teamStaffTable,
  teamRosterTable,
  playerRankingsTable,
  championshipSettingsTable,
  type ClubTeamRow,
  type ChampionshipDayRow,
  type TeamFixtureRow,
  type LineupSlotRow,
  type PlayerRankingRow
} from '../shared/schema';
import { weeklyExclusionGroup } from '../shared/week';

export class GetLineupRepository {
  async findTeam(db: DbOrTx, id: number): Promise<ClubTeamRow | undefined> {
    return db.select().from(clubTeamsTable).where(eq(clubTeamsTable.id, id)).get();
  }

  async findDay(
    db: DbOrTx,
    team: ClubTeamRow,
    number: number
  ): Promise<ChampionshipDayRow | undefined> {
    return db
      .select()
      .from(championshipDaysTable)
      .where(
        and(
          eq(championshipDaysTable.seasonCode, team.seasonCode),
          eq(championshipDaysTable.championship, team.championship),
          eq(championshipDaysTable.number, number)
        )
      )
      .get();
  }

  async findFixture(
    db: DbOrTx,
    teamId: number,
    dayId: number,
    slot: number
  ): Promise<TeamFixtureRow | undefined> {
    return db
      .select()
      .from(teamFixturesTable)
      .where(
        and(
          eq(teamFixturesTable.teamId, teamId),
          eq(teamFixturesTable.dayId, dayId),
          eq(teamFixturesTable.slot, slot)
        )
      )
      .get();
  }

  async listSlots(db: DbOrTx, fixtureId: number): Promise<LineupSlotRow[]> {
    return db
      .select()
      .from(lineupSlotsTable)
      .where(eq(lineupSlotsTable.fixtureId, fixtureId))
      .all();
  }

  async staffLicences(db: DbOrTx, teamId: number): Promise<{ captain?: string; vice?: string }> {
    const rows = await db.select().from(teamStaffTable).where(eq(teamStaffTable.teamId, teamId)).all();
    return {
      captain: rows.find((r) => r.role === 'captain')?.licence,
      vice: rows.find((r) => r.role === 'vice_captain')?.licence
    };
  }

  async rosterLicences(db: DbOrTx, teamId: number): Promise<string[]> {
    const rows = await db
      .select({ licence: teamRosterTable.licence })
      .from(teamRosterTable)
      .where(eq(teamRosterTable.teamId, teamId))
      .all();
    return rows.map((r) => r.licence);
  }

  async referenceEloDate(db: DbOrTx, team: ClubTeamRow): Promise<string | null> {
    const row = await db
      .select()
      .from(championshipSettingsTable)
      .where(
        and(
          eq(championshipSettingsTable.seasonCode, team.seasonCode),
          eq(championshipSettingsTable.championship, team.championship)
        )
      )
      .get();
    return row?.referenceEloDate ?? null;
  }

  /** Tous les classements publiés à cette date ou avant : la résolution se fait ensuite. */
  /**
   * Filtre en SQL, et non après coup : la table entière traversait le réseau à chaque
   * appel pour n'en garder qu'une partie, et cet appel a lieu une fois par équipe. Les
   * dates sont stockées en ISO, donc la comparaison lexicographique de SQLite est
   * exactement celle qu'appliquait le filtre JavaScript — et l'index
   * `player_rankings_date_idx` sert enfin à quelque chose.
   */
  async rankingsUpTo(db: DbOrTx, atDate: string): Promise<PlayerRankingRow[]> {
    return db
      .select()
      .from(playerRankingsTable)
      .where(lte(playerRankingsTable.eloDate, atDate))
      .all();
  }

  /** Les autres équipes du club dans le même championnat, pour la hiérarchie. */
  async siblingTeams(db: DbOrTx, team: ClubTeamRow): Promise<ClubTeamRow[]> {
    return db
      .select()
      .from(clubTeamsTable)
      .where(
        and(
          eq(clubTeamsTable.seasonCode, team.seasonCode),
          eq(clubTeamsTable.championship, team.championship),
          ne(clubTeamsTable.id, team.id)
        )
      )
      .all();
  }

  /**
   * Compositions des autres équipes **sur la même journée**.
   *
   * La hiérarchie des valeurs se compare à journée égale — la J2 de l'équipe 2 contre la
   * J2 de l'équipe 3 — même si un report les a séparées dans le temps.
   */
  async fixturesOnDay(db: DbOrTx, teamIds: number[], dayId: number): Promise<TeamFixtureRow[]> {
    if (teamIds.length === 0) return [];
    return db
      .select()
      .from(teamFixturesTable)
      .where(and(inArray(teamFixturesTable.teamId, teamIds), eq(teamFixturesTable.dayId, dayId)))
      .all();
  }

  /**
   * Rencontres des équipes du club rattachées à la **même semaine théorique**.
   *
   * C'est la semaine de la *journée* qui fait règle, jamais la date à laquelle la
   * rencontre se joue : le règlement dit « pour une même journée de championnat »
   * (art. 6.3.7). Un gymnase indisponible déplace la rencontre, il ne déplace pas la
   * journée — et ne change donc rien aux compositions permises.
   *
   * On ne retient que les championnats du même groupe d'exclusion : les vétérans
   * cohabitent librement avec les autres, leur règlement n'en citant aucun.
   */
  async fixturesInWeek(
    db: DbOrTx,
    team: ClubTeamRow,
    weekStart: string,
    exceptFixtureId: number | null
  ): Promise<Array<{ fixture: TeamFixtureRow; team: ClubTeamRow }>> {
    const group = weeklyExclusionGroup(team.championship) as readonly ClubTeamRow['championship'][];

    const teams = await db
      .select()
      .from(clubTeamsTable)
      .where(
        and(
          eq(clubTeamsTable.seasonCode, team.seasonCode),
          inArray(clubTeamsTable.championship, [...group])
        )
      )
      .all();
    if (teams.length === 0) return [];

    const byId = new Map(teams.map((t) => [t.id, t]));
    const fixtures = await db
      .select()
      .from(teamFixturesTable)
      .where(inArray(teamFixturesTable.teamId, [...byId.keys()]))
      .all();

    const days = await db.select().from(championshipDaysTable).all();
    const weekByDay = new Map(days.map((d) => [d.id, d.weekStart]));

    return fixtures
      .filter((f) => f.id !== exceptFixtureId)
      .filter((f) => weekByDay.get(f.dayId) === weekStart)
      .map((f) => ({ fixture: f, team: byId.get(f.teamId)! }));
  }

  async slotsForFixtures(db: DbOrTx, fixtureIds: number[]): Promise<LineupSlotRow[]> {
    if (fixtureIds.length === 0) return [];
    return db
      .select()
      .from(lineupSlotsTable)
      .where(inArray(lineupSlotsTable.fixtureId, fixtureIds))
      .all();
  }

  /**
   * Où chaque joueur du club a déjà été aligné cette saison, **avant** cette journée.
   *
   * Sert les trois règles d'historique : titularisation, renforts croisés entre mixte et
   * masculin, et quota de joueurs venus du régional. Aucune ne se juge sur la composition
   * du jour — elles regardent toutes en arrière.
   *
   * On lit tout le club, pas seulement l'équipe : la titularisation se compte par équipe,
   * mais elle interdit de *descendre*, donc il faut voir les équipes supérieures.
   */
  async playerHistory(
    db: DbOrTx,
    seasonCode: string,
    beforeWeekStart: string
  ): Promise<Map<string, Array<{ championship: ClubTeamRow['championship']; teamId: number; teamNumber: number; weekStart: string }>>> {
    const teams = await db
      .select()
      .from(clubTeamsTable)
      .where(eq(clubTeamsTable.seasonCode, seasonCode))
      .all();
    if (teams.length === 0) return new Map();

    const byTeam = new Map(teams.map((t) => [t.id, t]));
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
        .where(inArray(teamFixturesTable.teamId, [...byTeam.keys()]))
        .all()
    ).filter((f) => {
      const week = weekByDay.get(f.dayId);
      // Strictement avant : la journée en cours n'est pas encore de l'histoire.
      return week !== undefined && week < beforeWeekStart;
    });
    if (fixtures.length === 0) return new Map();

    const slots = await db
      .select()
      .from(lineupSlotsTable)
      .where(inArray(lineupSlotsTable.fixtureId, fixtures.map((f) => f.id)))
      .all();

    const fixtureById = new Map(fixtures.map((f) => [f.id, f]));
    const history = new Map<string, Array<{ championship: ClubTeamRow['championship']; teamId: number; teamNumber: number; weekStart: string }>>();

    const record = (licence: string, fixtureId: number) => {
      const fixture = fixtureById.get(fixtureId);
      if (!fixture) return;
      const team = byTeam.get(fixture.teamId);
      const week = weekByDay.get(fixture.dayId);
      if (!team || !week) return;
      history.set(licence, [
        ...(history.get(licence) ?? []),
        { championship: team.championship, teamId: team.id, teamNumber: team.number, weekStart: week }
      ]);
    };

    for (const slot of slots) {
      record(slot.licence1, slot.fixtureId);
      if (slot.licence2) record(slot.licence2, slot.fixtureId);
    }
    return history;
  }
}
