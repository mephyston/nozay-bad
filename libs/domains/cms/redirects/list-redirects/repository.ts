import { desc } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { cmsRedirectsTable, type CmsRedirectRow } from '../../shared/schema';

export class ListRedirectsRepository {
  async listAll(db: DbOrTx): Promise<CmsRedirectRow[]> {
    return db
      .select()
      .from(cmsRedirectsTable)
      // Les plus empruntées d'abord : ce sont celles qu'il ne faudra surtout pas purger.
      .orderBy(desc(cmsRedirectsTable.hitCount), desc(cmsRedirectsTable.createdAt))
      .all();
  }
}
