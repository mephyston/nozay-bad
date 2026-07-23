import { type DbOrTx } from '@nba/db';
import { eq, ne } from 'drizzle-orm';
import { seasonsTable } from '../../shared/schema';

export class UpdateSeasonRepository {
  async updateSeason(db: DbOrTx, id: string, values: {
    name?: string;
    active?: boolean;
    closed?: boolean;
  }): Promise<any | undefined> {
    return db.update(seasonsTable).set(values).where(eq(seasonsTable.id, id)).returning().get();
  }

  async deactivateAllSeasonsExcept(db: DbOrTx, activeId?: string): Promise<void> {
    const whereClause = activeId ? ne(seasonsTable.id, activeId) : undefined;
    await db.update(seasonsTable).set({ active: false }).where(whereClause).run();
  }
}
