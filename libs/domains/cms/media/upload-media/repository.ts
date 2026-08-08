import { eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { cmsMediaTable, type CmsMediaRow } from '../../shared/schema';

export class UploadMediaRepository {
  async findByHash(db: DbOrTx, contentHash: string): Promise<CmsMediaRow | undefined> {
    return db.select().from(cmsMediaTable).where(eq(cmsMediaTable.contentHash, contentHash)).get();
  }

  async insert(db: DbOrTx, values: typeof cmsMediaTable.$inferInsert): Promise<CmsMediaRow> {
    const [row] = await db.insert(cmsMediaTable).values(values).returning();
    return row;
  }
}
