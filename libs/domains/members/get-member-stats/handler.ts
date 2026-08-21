import { type Db } from '@nba/db';
import { membershipsTable, personsTable } from '@nba/members/schema';
import { eq, sql } from 'drizzle-orm';
import { getSeasonId } from '@nba/accounting-api';

/**
 * Statistiques de population du club.
 *
 * Avec une saison : les **adhérents de cette saison**. Sans saison : les **personnes
 * connues du club**, chacune comptée une fois.
 *
 * La distinction n'existait pas : la requête portait sur `members`, une ligne par
 * (licence, saison), si bien qu'une personne inscrite trois saisons pesait trois fois dans
 * l'effectif, trois fois dans la répartition par sexe, et trois fois son âge dans la
 * moyenne. C'est précisément ce que la séparation de la personne et de l'adhésion répare.
 */
export async function getMemberStats(db: Db, filters: { season?: string | number } = {}) {
  let sId: number | undefined;
  if (filters.season) {
    sId = await getSeasonId(db, filters.season);
  }

  // Âge en années civiles, sans tenir compte du jour anniversaire — comportement inchangé.
  const age = sql`(cast(strftime('%Y', 'now') as integer) - cast(strftime('%Y', ${personsTable.birthDate}) as integer))`;

  const columns = {
    totalMembers: sql<number>`count(*)`,
    maleCount: sql<number>`sum(case when ${personsTable.gender} = 'M' then 1 else 0 end)`,
    femaleCount: sql<number>`sum(case when ${personsTable.gender} = 'F' then 1 else 0 end)`,
    averageAge: sql<number>`avg(${age})`,
    under18Count: sql<number>`sum(case when ${age} < 18 then 1 else 0 end)`,
    between18And30Count: sql<number>`sum(case when ${age} >= 18 and ${age} <= 30 then 1 else 0 end)`,
    over30Count: sql<number>`sum(case when ${age} > 30 then 1 else 0 end)`
  };

  const result = sId !== undefined
    ? await db
        .select(columns)
        .from(membershipsTable)
        .innerJoin(personsTable, eq(personsTable.id, membershipsTable.personId))
        .where(eq(membershipsTable.seasonId, sId))
        .get()
    : await db.select(columns).from(personsTable).get();

  return {
    totalMembers: result?.totalMembers || 0,
    maleCount: result?.maleCount || 0,
    femaleCount: result?.femaleCount || 0,
    averageAge: result?.averageAge ? Math.round(result.averageAge * 10) / 10 : null,
    ageBrackets: {
      under18: result?.under18Count || 0,
      between18And30: result?.between18And30Count || 0,
      over30: result?.over30Count || 0
    }
  };
}
