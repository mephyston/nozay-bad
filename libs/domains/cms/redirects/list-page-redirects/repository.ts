import { desc, eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { cmsRedirectsTable, type CmsRedirectRow } from '../../shared/schema';

export class ListPageRedirectsRepository {
  async listByTarget(db: DbOrTx, toPath: string): Promise<CmsRedirectRow[]> {
    return db
      .select()
      .from(cmsRedirectsTable)
      .where(eq(cmsRedirectsTable.toPath, toPath))
      // Les plus empruntées d'abord : ce sont celles qu'il ne faudra surtout pas purger.
      .orderBy(desc(cmsRedirectsTable.hitCount), desc(cmsRedirectsTable.createdAt))
      .all();
  }
}
