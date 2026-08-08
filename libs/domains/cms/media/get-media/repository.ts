import { asc, eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { cmsMediaTable, cmsMediaVariantsTable, type CmsMediaRow, type CmsMediaVariantRow } from '../../shared/schema';

export class GetMediaRepository {
  async findById(db: DbOrTx, id: number): Promise<CmsMediaRow | undefined> {
    return db.select().from(cmsMediaTable).where(eq(cmsMediaTable.id, id)).get();
  }

  async findVariants(db: DbOrTx, mediaId: number): Promise<CmsMediaVariantRow[]> {
    return db
      .select()
      .from(cmsMediaVariantsTable)
      .where(eq(cmsMediaVariantsTable.mediaId, mediaId))
      .orderBy(asc(cmsMediaVariantsTable.width))
      .all();
  }
}
