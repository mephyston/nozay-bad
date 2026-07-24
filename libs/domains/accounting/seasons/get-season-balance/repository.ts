import { type DbOrTx } from '@nba/db';
import { eq, and, gte, lte } from 'drizzle-orm';
import { seasonsTable, seasonBalancesTable, ledgerEntriesTable } from '../../shared/schema';

export class GetSeasonBalanceRepository {
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

  async getTransactionsForPeriod(db: DbOrTx, startDate: string, endDate: string): Promise<any[]> {
    return db.select()
      .from(ledgerEntriesTable)
      .where(and(
        gte(ledgerEntriesTable.date, startDate),
        lte(ledgerEntriesTable.date, endDate)
      ))
      .all();
  }
}
