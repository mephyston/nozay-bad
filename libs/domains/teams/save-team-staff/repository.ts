import { and, eq, inArray } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { clubTeamsTable, teamStaffTable, type ClubTeamRow } from '../shared/schema';

export class SaveTeamStaffRepository {
  async findTeam(db: DbOrTx, id: number): Promise<ClubTeamRow | undefined> {
    return db.select().from(clubTeamsTable).where(eq(clubTeamsTable.id, id)).get();
  }

  /**
   * Remplace le staff de l'équipe : on efface puis on réécrit.
   *
   * Le staff compte au plus deux lignes et se saisit d'un seul geste dans l'écran ; un
   * différentiel ligne à ligne coûterait plus de code qu'il n'en économise, pour un
   * résultat identique.
   */
  async replaceStaff(
    db: DbOrTx,
    teamId: number,
    staff: { captain: string | null; viceCaptain: string | null },
    now: Date
  ): Promise<void> {
    await db.delete(teamStaffTable).where(eq(teamStaffTable.teamId, teamId));

    const rows = [
      staff.captain ? { teamId, licence: staff.captain, role: 'captain' as const, createdAt: now } : null,
      staff.viceCaptain
        ? { teamId, licence: staff.viceCaptain, role: 'vice_captain' as const, createdAt: now }
        : null
    ].filter((row): row is NonNullable<typeof row> => row !== null);

    if (rows.length > 0) await db.insert(teamStaffTable).values(rows);
  }
}
