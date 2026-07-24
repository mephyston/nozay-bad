import { type DbOrTx } from '@nba/db';
import { eq } from 'drizzle-orm';
import { invoicesTable, seasonsTable } from '../../shared/schema';

export class ListInvoicesRepository {
  async resolveSeasonId(db: DbOrTx, seasonIdOrCode: string | number): Promise<number> {
    if (typeof seasonIdOrCode === 'number') return seasonIdOrCode;
    const num = Number(seasonIdOrCode);
    if (!isNaN(num)) return num;
    const row = await db.select({ id: seasonsTable.id }).from(seasonsTable).where(eq(seasonsTable.code, seasonIdOrCode)).get();
    return row?.id || 1;
  }

  async list(db: DbOrTx, seasonId?: any): Promise<any[]> {
    if (!seasonId) {
      return db.select().from(invoicesTable).all();
    }
    const idVal = typeof seasonId === 'object' ? seasonId.seasonId : seasonId;
    if (!idVal) return db.select().from(invoicesTable).all();
    const seasonIdInt = await this.resolveSeasonId(db, idVal);
    return db.select().from(invoicesTable).where(eq(invoicesTable.seasonId, seasonIdInt)).all();
  }
}
