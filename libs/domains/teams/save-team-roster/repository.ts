import { eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { clubTeamsTable, teamRosterTable, type ClubTeamRow } from '../shared/schema';
import { chunkForD1 } from '../shared/d1-batch';

/** `team_id`, `licence`, `created_at` : trois colonnes liées par ligne. */
const ROSTER_COLUMNS = 3;

export class SaveTeamRosterRepository {
  async findTeam(db: DbOrTx, id: number): Promise<ClubTeamRow | undefined> {
    return db.select().from(clubTeamsTable).where(eq(clubTeamsTable.id, id)).get();
  }

  /** Remplace l'effectif : l'écran le saisit d'un bloc, la base le reçoit d'un bloc. */
  async replaceRoster(db: DbOrTx, teamId: number, licences: string[], now: Date): Promise<void> {
    await db.delete(teamRosterTable).where(eq(teamRosterTable.teamId, teamId));
    if (licences.length === 0) return;

    for (const chunk of chunkForD1(licences, ROSTER_COLUMNS)) {
      await db.insert(teamRosterTable).values(
        chunk.map((licence) => ({ teamId, licence, createdAt: now }))
      );
    }
  }
}
