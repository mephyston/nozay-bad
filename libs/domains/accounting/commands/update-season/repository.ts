import { eq, ne } from 'drizzle-orm';
import { seasonsTable } from '@metacult/features-members-data-access';

export class UpdateSeasonRepository {
  async updateSeason(db: any, id: string, values: {
    name?: string;
    active?: boolean;
    closed?: boolean;
  }): Promise<any | undefined> {
    return db.update(seasonsTable).set(values).where(eq(seasonsTable.id, id)).returning().get();
  }

  async deactivateAllSeasonsExcept(db: any, activeId?: string): Promise<void> {
    const whereClause = activeId ? ne(seasonsTable.id, activeId) : undefined;
    await db.update(seasonsTable).set({ active: false }).where(whereClause).run();
  }
}
