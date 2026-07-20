import { eq } from 'drizzle-orm';
import { seasonsTable } from '@metacult/features-members-data-access';

export class CloseSeasonRepository {
  async getSeasonById(db: any, id: string): Promise<any | undefined> {
    return db.select().from(seasonsTable).where(eq(seasonsTable.id, id)).get();
  }

  async updateSeason(db: any, id: string, values: {
    closed?: boolean;
  }): Promise<any | undefined> {
    return db.update(seasonsTable).set(values).where(eq(seasonsTable.id, id)).returning().get();
  }
}
