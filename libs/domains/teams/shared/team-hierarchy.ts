import { and, asc, desc, eq, gt, lt } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { clubTeamsTable, type ClubTeamRow } from './schema';

/**
 * L'équipe qui précède dans la hiérarchie du club : le numéro **immédiatement inférieur**
 * du même championnat, et non `number - 1` — une équipe dissoute en cours de saison
 * laisserait un trou, et le plafond serait alors cherché sur une équipe inexistante.
 */
export async function findUpperTeam(db: DbOrTx, team: ClubTeamRow): Promise<ClubTeamRow | undefined> {
  return db
    .select()
    .from(clubTeamsTable)
    .where(
      and(
        eq(clubTeamsTable.seasonCode, team.seasonCode),
        eq(clubTeamsTable.championship, team.championship),
        lt(clubTeamsTable.number, team.number),
        eq(clubTeamsTable.active, true)
      )
    )
    .orderBy(desc(clubTeamsTable.number))
    .get();
}

/**
 * Miroir : l'équipe qui suit dans la hiérarchie (numéro immédiatement supérieur).
 * C'est elle dont la composition déjà saisie peut se retrouver au-dessus quand
 * l'équipe du dessus s'affaiblit.
 */
export async function findLowerTeam(db: DbOrTx, team: ClubTeamRow): Promise<ClubTeamRow | undefined> {
  return db
    .select()
    .from(clubTeamsTable)
    .where(
      and(
        eq(clubTeamsTable.seasonCode, team.seasonCode),
        eq(clubTeamsTable.championship, team.championship),
        gt(clubTeamsTable.number, team.number),
        eq(clubTeamsTable.active, true)
      )
    )
    .orderBy(asc(clubTeamsTable.number))
    .get();
}
