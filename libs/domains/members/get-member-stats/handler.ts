import { type Db } from '@nba/db';
import { membersTable } from '@nba/members/schema';
import { eq, sql, and } from 'drizzle-orm';
import { getSeasonId } from '@nba/accounting-api';

export async function getMemberStats(db: Db, filters: { season?: string | number } = {}) {
  let sId: number | undefined;
  if (filters.season) {
    sId = await getSeasonId(db, filters.season);
  }

  const whereClause = sId !== undefined ? eq(membersTable.seasonId, sId) : undefined;

  const result = await db.select({
    totalMembers: sql<number>`count(*)`,
    maleCount: sql<number>`sum(case when gender = 'M' then 1 else 0 end)`,
    femaleCount: sql<number>`sum(case when gender = 'F' then 1 else 0 end)`,
    averageAge: sql<number>`avg(cast(strftime('%Y', 'now') as integer) - cast(strftime('%Y', birth_date) as integer))`,
    under18Count: sql<number>`sum(case when (cast(strftime('%Y', 'now') as integer) - cast(strftime('%Y', birth_date) as integer)) < 18 then 1 else 0 end)`,
    between18And30Count: sql<number>`sum(case when (cast(strftime('%Y', 'now') as integer) - cast(strftime('%Y', birth_date) as integer)) >= 18 and (cast(strftime('%Y', 'now') as integer) - cast(strftime('%Y', birth_date) as integer)) <= 30 then 1 else 0 end)`,
    over30Count: sql<number>`sum(case when (cast(strftime('%Y', 'now') as integer) - cast(strftime('%Y', birth_date) as integer)) > 30 then 1 else 0 end)`
  })
  .from(membersTable)
  .where(whereClause)
  .get();

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
