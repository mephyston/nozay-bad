import { asc, eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { cmsNavItemsTable, cmsPagesTable, type CmsNavItemRow, type CmsPageRow } from '../../shared/schema';
import type { NavLocation } from '../../shared/nav';

export class ListNavItemsRepository {
  async list(db: DbOrTx, location?: NavLocation): Promise<CmsNavItemRow[]> {
    const base = db
      .select()
      .from(cmsNavItemsTable)
      .orderBy(asc(cmsNavItemsTable.position), asc(cmsNavItemsTable.id));
    return location ? base.where(eq(cmsNavItemsTable.location, location)).all() : base.all();
  }

  /** Toutes les pages, pour résoudre `pageId` en chemin sans requête par entrée. */
  async pages(db: DbOrTx): Promise<CmsPageRow[]> {
    return db.select().from(cmsPagesTable).all();
  }
}
