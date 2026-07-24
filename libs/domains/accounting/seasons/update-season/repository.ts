import { type DbOrTx } from '@nba/db';
import { eq, ne } from 'drizzle-orm';
import { seasonsTable } from '../../shared/schema';

export class UpdateSeasonRepository {
  async updateSeason(db: DbOrTx, id: string | number, values: {
    name?: string;
    active?: boolean;
    closed?: boolean;
  }): Promise<any | undefined> {
    const isNum = !isNaN(Number(id));
    const cond = isNum ? eq(seasonsTable.id, Number(id)) : eq(seasonsTable.code, String(id));
    return db.update(seasonsTable).set(values).where(cond).returning().get();
  }

  async deactivateAllSeasonsExcept(db: DbOrTx, activeId?: string | number): Promise<void> {
    const isNum = activeId !== undefined && !isNaN(Number(activeId));
    const whereClause = activeId ? (isNum ? ne(seasonsTable.id, Number(activeId)) : ne(seasonsTable.code, String(activeId))) : undefined;
    await db.update(seasonsTable).set({ active: false }).where(whereClause).run();
  }
}
