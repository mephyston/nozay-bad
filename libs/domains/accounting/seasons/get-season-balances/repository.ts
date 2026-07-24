import { type DbOrTx } from '@nba/db';
import { eq } from 'drizzle-orm';
import { seasonsTable, seasonBalancesTable } from '../../shared/schema';

export class GetSeasonBalancesRepository {
  async resolveSeasonId(db: DbOrTx, seasonIdOrCode: string | number): Promise<number> {
    if (typeof seasonIdOrCode === 'number') return seasonIdOrCode;
    const num = Number(seasonIdOrCode);
    if (!isNaN(num)) return num;
    const row = await db.select({ id: seasonsTable.id }).from(seasonsTable).where(eq(seasonsTable.code, seasonIdOrCode)).get();
    return row?.id || 1;
  }

  async getBalances(db: DbOrTx, seasonId: string | number): Promise<any[]> {
    const seasonIdInt = await this.resolveSeasonId(db, seasonId);
    return db.select().from(seasonBalancesTable).where(eq(seasonBalancesTable.seasonId, seasonIdInt)).all();
  }
}
