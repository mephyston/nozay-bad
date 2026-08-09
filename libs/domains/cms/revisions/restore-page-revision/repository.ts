import { and, eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import {
  cmsPagesTable, cmsPageBlocksTable, cmsPageRevisionsTable,
  type CmsPageRow, type CmsPageRevisionRow
} from '../../shared/schema';
import type { BlockPayload } from '../../shared/blocks';

export class RestorePageRevisionRepository {
  async findPage(db: DbOrTx, id: number): Promise<CmsPageRow | undefined> {
    return db.select().from(cmsPagesTable).where(eq(cmsPagesTable.id, id)).get();
  }

  /** La révision doit appartenir à la page : un identifiant seul ne suffit pas. */
  async findRevision(db: DbOrTx, pageId: number, revisionId: number): Promise<CmsPageRevisionRow | undefined> {
    return db
      .select()
      .from(cmsPageRevisionsTable)
      .where(and(eq(cmsPageRevisionsTable.id, revisionId), eq(cmsPageRevisionsTable.pageId, pageId)))
      .get();
  }

  buildRestoreStatements(
    db: DbOrTx,
    pageId: number,
    meta: { title: string; seoTitle: string | null; seoDescription: string | null; noindex: boolean },
    blocks: BlockPayload[],
    authorEmail: string,
    now: Date
  ) {
    const statements: unknown[] = [
      db.delete(cmsPageBlocksTable).where(eq(cmsPageBlocksTable.pageId, pageId))
    ];
    blocks.forEach((block, position) => {
      statements.push(
        db.insert(cmsPageBlocksTable).values({
          pageId, position, type: block.type, payload: JSON.stringify(block)
        })
      );
    });
    // Le slug et le statut ne sont **pas** restaurés : remettre une ancienne adresse
    // casserait les liens entrants, et republier une page volontairement retirée
    // serait une surprise. La restauration porte le contenu, pas la mise en ligne.
    statements.push(
      db.update(cmsPagesTable)
        .set({ ...meta, updatedByEmail: authorEmail, updatedAt: now })
        .where(eq(cmsPagesTable.id, pageId))
    );
    return statements;
  }
}
