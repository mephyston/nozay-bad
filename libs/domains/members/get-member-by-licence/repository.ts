import { membershipsTable, personsTable } from '@nba/members/schema';
import { eq, and } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { getSeasonId } from '@nba/accounting-api';
import { selectMembers } from '../shared/queries';
import type { GetMemberByLicenceOutput } from './dto';


export class GetMemberRepository {
  /**
   * Sans saison, la fiche rend une adhésion quelconque de cette licence — comportement
   * hérité, que tous les appelants évitent en passant la saison affichée.
   */
  async getByLicence(db: DbOrTx, licence: string, season?: string): Promise<GetMemberByLicenceOutput | undefined> {
    const conditions = [eq(personsTable.licence, licence)];
    if (season) {
      const sId = await getSeasonId(db, season);
      if (sId !== undefined) conditions.push(eq(membershipsTable.seasonId, sId));
    }

    const row = await selectMembers(db).where(and(...conditions)).get();
    if (!row) return undefined;
    return { ...row, photoUpdatedAt: row.photoUpdatedAt?.getTime() ?? null };
  }
}
