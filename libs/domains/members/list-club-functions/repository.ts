import { and, asc, eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { memberClubFunctionsTable, membershipsTable, personsTable } from '@nba/members/schema';
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
  // L'attribution vit par licence : l'identité vient de la personne, et l'adhésion de la
  // saison n'est là que pour rendre `memberId`. Les deux jointures restent à gauche — un
  // dirigeant qui n'a pas repris sa licence garde sa fonction, avec `memberId` à null.
  const rows = await db
    .select({
      licence: memberClubFunctionsTable.licence,
      function: memberClubFunctionsTable.function,
      memberId: membershipsTable.id,
      firstName: personsTable.firstName,
      lastName: personsTable.lastName
    })
    .from(memberClubFunctionsTable)
    .leftJoin(personsTable, eq(personsTable.licence, memberClubFunctionsTable.licence))
    .leftJoin(
      membershipsTable,
      and(
        eq(membershipsTable.personId, personsTable.id),
        eq(membershipsTable.seasonId, memberClubFunctionsTable.seasonId)
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
