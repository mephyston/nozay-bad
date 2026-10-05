import { and, eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { clubTeamsTable, teamRosterTable, type ClubTeamRow } from '../shared/schema';
import { chunkForD1 } from '../shared/d1-batch';
import type { Championship } from '../shared/championship';

/** `team_id`, `licence`, `created_at` : trois colonnes liées par ligne. */
const ROSTER_COLUMNS = 3;

export class SaveChampionshipRostersRepository {
  async activeTeams(db: DbOrTx, seasonCode: string, championship: Championship): Promise<ClubTeamRow[]> {
    return db
      .select()
      .from(clubTeamsTable)
      .where(
        and(
          eq(clubTeamsTable.seasonCode, seasonCode),
          eq(clubTeamsTable.championship, championship),
          eq(clubTeamsTable.active, true)
        )
      )
      .all();
  }

  /**
   * Les effectifs de toutes les équipes, remplacés **en un seul lot**.
   *
   * Rendues à l'appelant plutôt qu'exécutées : seul `db.batch()` garantit que les
   * suppressions et les insertions réussissent ou échouent ensemble (ADR-0005). Une
   * panne au milieu laisserait sinon un joueur retiré de son ancienne équipe sans être
   * inscrit dans la nouvelle.
   */
  buildReplaceStatements(db: DbOrTx, rosters: Array<{ teamId: number; licences: string[] }>, now: Date): unknown[] {
    const statements: unknown[] = rosters.map((r) => db.delete(teamRosterTable).where(eq(teamRosterTable.teamId, r.teamId)));
    for (const r of rosters) {
      for (const chunk of chunkForD1(r.licences, ROSTER_COLUMNS)) {
        statements.push(db.insert(teamRosterTable).values(chunk.map((licence) => ({ teamId: r.teamId, licence, createdAt: now }))));
      }
    }
    return statements;
  }
}
