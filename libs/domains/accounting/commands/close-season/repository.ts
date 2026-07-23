import { type DbOrTx } from '@metacult/shared-db';
import { eq } from 'drizzle-orm';
import { seasonsTable } from '../../shared/schema';

export interface CloseSeasonRepositoryInterface {
  getSeasonById(db: DbOrTx, id: string): Promise<any | undefined>;
  updateSeason(db: DbOrTx, id: string, values: { closed?: boolean }): Promise<any | undefined>;
}

export class CloseSeasonRepository implements CloseSeasonRepositoryInterface {
  async getSeasonById(db: DbOrTx, id: string): Promise<any | undefined> {
    return db.select().from(seasonsTable).where(eq(seasonsTable.id, id)).get();
  }

  async updateSeason(db: DbOrTx, id: string, values: {
    closed?: boolean;
  }): Promise<any | undefined> {
    return db.update(seasonsTable).set(values).where(eq(seasonsTable.id, id)).returning().get();
  }
}
