import { and, eq, inArray, sql } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import {
  clubTeamsTable,
  teamStaffTable,
  teamRosterTable,
  type ClubTeamRow,
  type TeamStaffRow
} from '../shared/schema';

export class ListTeamsRepository {
  async listBySeason(db: DbOrTx, seasonCode: string): Promise<ClubTeamRow[]> {
    return db
      .select()
      .from(clubTeamsTable)
      .where(eq(clubTeamsTable.seasonCode, seasonCode))
      .all();
  }

  async staffFor(db: DbOrTx, teamIds: number[]): Promise<TeamStaffRow[]> {
    if (teamIds.length === 0) return [];
    return db.select().from(teamStaffTable).where(inArray(teamStaffTable.teamId, teamIds)).all();
  }

  /** Effectifs comptés en une requête : une par équipe ferait N+1 sur chaque affichage. */
  async rosterCounts(db: DbOrTx, teamIds: number[]): Promise<Map<number, number>> {
    if (teamIds.length === 0) return new Map();

    const rows = await db
      .select({ teamId: teamRosterTable.teamId, total: sql<number>`count(*)` })
      .from(teamRosterTable)
      .where(inArray(teamRosterTable.teamId, teamIds))
      .groupBy(teamRosterTable.teamId)
      .all();

    return new Map(rows.map((row) => [row.teamId, Number(row.total)]));
  }

  /**
   * Les équipes de la liste où figure une licence donnée.
   *
   * Une seule requête pour tout l'écran, sur le même principe que le comptage : c'est
   * l'appartenance du lecteur, pas l'effectif complet, qui remonte — les licences des
   * autres joueurs n'ont rien à faire dans la réponse d'une liste publique.
   */
  async rosterTeamsOf(db: DbOrTx, teamIds: number[], licence: string): Promise<Set<number>> {
    if (teamIds.length === 0 || !licence) return new Set();

    const rows = await db
      .select({ teamId: teamRosterTable.teamId })
      .from(teamRosterTable)
      .where(and(inArray(teamRosterTable.teamId, teamIds), eq(teamRosterTable.licence, licence)))
      .all();

    return new Set(rows.map((row) => row.teamId));
  }
}
