import { and, eq, inArray } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { memberClubFunctionsTable, membersTable } from '@nba/members/schema';
import type { ClubFunction } from '../shared/club-functions';

export async function findMemberBySeasonLicence(
  db: DbOrTx,
  seasonId: number,
  licence: string
): Promise<{ id: number; firstName: string; lastName: string } | undefined> {
  return db
    .select({
      id: membersTable.id,
      firstName: membersTable.firstName,
      lastName: membersTable.lastName
    })
    .from(membersTable)
    .where(and(eq(membersTable.seasonId, seasonId), eq(membersTable.licence, licence)))
    .get();
}

/** Titulaires actuels des fonctions données sur la saison, identité résolue si possible. */
export async function findHolders(
  db: DbOrTx,
  seasonId: number,
  functions: ClubFunction[]
): Promise<Array<{ licence: string; function: ClubFunction; firstName: string | null; lastName: string | null }>> {
  if (functions.length === 0) return [];
  const rows = await db
    .select({
      licence: memberClubFunctionsTable.licence,
      function: memberClubFunctionsTable.function,
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
    .where(
      and(
        eq(memberClubFunctionsTable.seasonId, seasonId),
        inArray(memberClubFunctionsTable.function, functions)
      )
    )
    .all();
  return rows as Array<{
    licence: string;
    function: ClubFunction;
    firstName: string | null;
    lastName: string | null;
  }>;
}

/**
 * Remplace les fonctions d'un adhérent sur la saison : delete puis insert, comme le
 * staff d'équipe — une fonction retirée doit disparaître, pas survivre à l'écriture.
 */
export async function replaceFunctions(
  db: DbOrTx,
  seasonId: number,
  licence: string,
  functions: ClubFunction[],
  now: Date
): Promise<void> {
  await db
    .delete(memberClubFunctionsTable)
    .where(
      and(
        eq(memberClubFunctionsTable.seasonId, seasonId),
        eq(memberClubFunctionsTable.licence, licence)
      )
    )
    .run();

  if (functions.length === 0) return;
  await db
    .insert(memberClubFunctionsTable)
    .values(functions.map((fn) => ({ seasonId, licence, function: fn, createdAt: now })))
    .run();
}
