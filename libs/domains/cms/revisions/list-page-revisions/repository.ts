import { desc, eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { cmsPageRevisionsTable, type CmsPageRevisionRow } from '../../shared/schema';

export class ListPageRevisionsRepository {
  async list(db: DbOrTx, pageId: number): Promise<CmsPageRevisionRow[]> {
    return db
      .select()
      .from(cmsPageRevisionsTable)
      .where(eq(cmsPageRevisionsTable.pageId, pageId))
      .orderBy(desc(cmsPageRevisionsTable.revision))
      .all();
  }
}
