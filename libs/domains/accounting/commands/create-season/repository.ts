import { ne } from 'drizzle-orm';
import { seasonsTable } from '../../shared/schema';

export class CreateSeasonRepository {
  async createSeason(db: any, values: {
    id: string;
    name: string;
    active: boolean;
    createdAt: Date;
  }): Promise<any> {
    return db.insert(seasonsTable).values(values).returning().get();
  }

  async deactivateAllSeasonsExcept(db: any, activeId?: string): Promise<void> {
    const whereClause = activeId ? ne(seasonsTable.id, activeId) : undefined;
    await db.update(seasonsTable).set({ active: false }).where(whereClause).run();
  }
}
