import { eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { cmsMediaTable, type CmsMediaRow } from '../../shared/schema';

export class UpdateMediaRepository {
  async findById(db: DbOrTx, id: number): Promise<CmsMediaRow | undefined> {
    return db.select().from(cmsMediaTable).where(eq(cmsMediaTable.id, id)).get();
  }

  async updateAlt(db: DbOrTx, id: number, alt: string): Promise<void> {
    await db.update(cmsMediaTable).set({ alt }).where(eq(cmsMediaTable.id, id)).run();
  }
}
