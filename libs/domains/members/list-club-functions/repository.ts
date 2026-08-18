import { and, asc, eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { memberClubFunctionsTable, membersTable } from '@nba/members/schema';
import type { ClubFunction } from '../shared/club-functions';

export async function findAssignmentsBySeason(
  db: DbOrTx,
  seasonId: number
): Promise<
  Array<{
    licence: string;
    function: ClubFunction;
    memberId: number | null;
    firstName: string | null;
    lastName: string | null;
  }>
> {
  // Jointure intra-domaine sur (licence, saison) : l'attribution vit par licence,
  // l'identité est résolue à la lecture — un dossier disparu laisse memberId à null.
  const rows = await db
    .select({
      licence: memberClubFunctionsTable.licence,
      function: memberClubFunctionsTable.function,
      memberId: membersTable.id,
      firstName: membersTable.firstName,
      lastName: membersTable.lastName
    })
    .from(memberClubFunctionsTable)
    .leftJoin(
      membersTable,
      and(
        eq(membersTable.licence, memberClubFunctionsTable.licence),
        eq(membersTable.seasonId, memberClubFunctionsTable.seasonId)
      )
    )
    .where(eq(memberClubFunctionsTable.seasonId, seasonId))
    .orderBy(asc(memberClubFunctionsTable.function), asc(memberClubFunctionsTable.licence))
    .all();

  return rows as Array<{
    licence: string;
    function: ClubFunction;
    memberId: number | null;
    firstName: string | null;
    lastName: string | null;
  }>;
}
