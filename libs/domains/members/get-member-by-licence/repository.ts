import { membersTable, memberProfilesTable } from '@nba/members/schema';
import { eq, and } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { getSeasonId } from '@nba/accounting-api';
import type { GetMemberByLicenceOutput } from './dto';


export class GetMemberRepository {
  async getByLicence(db: DbOrTx, licence: string, season?: string): Promise<GetMemberByLicenceOutput | undefined> {
    const conditions = [eq(membersTable.licence, licence)];
    if (season) {
      const sId = await getSeasonId(db, season);
      if (sId !== undefined) conditions.push(eq(membersTable.seasonId, sId));
    }
    // Jointure et non seconde requête : le profil se rattache à la licence, la même
    // dont on part, et la fiche est lue à chaque affichage d'adhérent.
    const row = await db
      .select({ member: membersTable, photoUpdatedAt: memberProfilesTable.photoUpdatedAt })
      .from(membersTable)
      .leftJoin(memberProfilesTable, eq(memberProfilesTable.licence, membersTable.licence))
      .where(and(...conditions))
      .get();

    if (!row) return undefined;
    return { ...row.member, photoUpdatedAt: row.photoUpdatedAt?.getTime() ?? null };
  }
}
