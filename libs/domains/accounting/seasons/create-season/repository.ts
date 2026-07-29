import { seasonsTable } from '@nba/accounting/schema';
import { type DbOrTx } from '@nba/db';
import { ne } from 'drizzle-orm';


export class CreateSeasonRepository {
  async createSeason(db: DbOrTx, values: {
    code: string;
    name: string;
    startDate: string;
    endDate: string;
    active: boolean;
    createdAt: Date;
  }): Promise<any> {
    return db.insert(seasonsTable).values(values).returning().get();
  }

  async deactivateAllSeasonsExcept(db: DbOrTx, activeId?: string | number): Promise<void> {
    const num = activeId !== undefined ? Number(activeId) : NaN;
    const whereClause = !isNaN(num) ? ne(seasonsTable.id, num) : undefined;
    await db.update(seasonsTable).set({ active: false }).where(whereClause).run();
  }
}
