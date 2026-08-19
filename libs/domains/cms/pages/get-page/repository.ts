import { asc, eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { cmsPagesTable, cmsPageBlocksTable, type CmsPageRow, type CmsPageBlockRow } from '../../shared/schema';

export class GetPageRepository {
  async findById(db: DbOrTx, id: number): Promise<CmsPageRow | undefined> {
    return db.select().from(cmsPagesTable).where(eq(cmsPagesTable.id, id)).get();
  }

  async findBlocks(db: DbOrTx, pageId: number): Promise<CmsPageBlockRow[]> {
    return db
      .select()
      .from(cmsPageBlocksTable)
      .where(eq(cmsPageBlocksTable.pageId, pageId))
      .orderBy(asc(cmsPageBlocksTable.position))
      .all();
  }
}
