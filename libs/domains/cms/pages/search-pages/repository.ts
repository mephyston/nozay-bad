import { and, eq, inArray } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { cmsPagesTable, cmsPageBlocksTable } from '../../shared/schema';

export interface SearchablePageRow {
  id: number;
  path: string;
  title: string;
  seoDescription: string | null;
}

export class SearchPagesRepository {
  async listPublished(db: DbOrTx): Promise<SearchablePageRow[]> {
    return db
      .select({ id: cmsPagesTable.id, path: cmsPagesTable.path, title: cmsPagesTable.title, seoDescription: cmsPagesTable.seoDescription })
      .from(cmsPagesTable)
      .where(eq(cmsPagesTable.status, 'published'))
      .all();
  }

  /** Les blocs des pages données, dans l'ordre de lecture : leur texte est le contenu du site. */
  async blocksOf(db: DbOrTx, pageIds: number[]): Promise<{ pageId: number; payload: string }[]> {
    if (pageIds.length === 0) return [];
    return db
      .select({ pageId: cmsPageBlocksTable.pageId, payload: cmsPageBlocksTable.payload })
      .from(cmsPageBlocksTable)
      .where(and(inArray(cmsPageBlocksTable.pageId, pageIds)))
      .orderBy(cmsPageBlocksTable.pageId, cmsPageBlocksTable.position)
      .all();
  }
}
