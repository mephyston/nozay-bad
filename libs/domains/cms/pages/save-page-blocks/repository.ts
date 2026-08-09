import { asc, desc, eq, inArray } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import {
  cmsPagesTable,
  cmsPageBlocksTable,
  cmsPageRevisionsTable,
  type CmsPageRow,
  type CmsPageBlockRow
} from '../../shared/schema';
import type { BlockPayload } from '../../shared/blocks';
import { MAX_REVISIONS_PER_PAGE, type PageSnapshot } from '../../shared/revision';

export class SavePageBlocksRepository {
  async findPage(db: DbOrTx, id: number): Promise<CmsPageRow | undefined> {
    return db.select().from(cmsPagesTable).where(eq(cmsPagesTable.id, id)).get();
  }

  /** Blocs actuels, pour l'instantané pris avant écrasement. */
  async findBlocks(db: DbOrTx, pageId: number): Promise<CmsPageBlockRow[]> {
    return db
      .select()
      .from(cmsPageBlocksTable)
      .where(eq(cmsPageBlocksTable.pageId, pageId))
      .orderBy(asc(cmsPageBlocksTable.position))
      .all();
  }

  async nextRevisionNumber(db: DbOrTx, pageId: number): Promise<number> {
    const [last] = await db
      .select()
      .from(cmsPageRevisionsTable)
      .where(eq(cmsPageRevisionsTable.pageId, pageId))
      .orderBy(desc(cmsPageRevisionsTable.revision))
      .limit(1)
      .all();
    return (last?.revision ?? 0) + 1;
  }

  /**
   * Identifiants des révisions à écarter au-delà du plafond.
   *
   * Calculé plutôt qu'exprimé en sous-requête : D1 exécute un lot d'instructions
   * préparées, et un `DELETE ... WHERE id NOT IN (SELECT ...)` y est nettement plus
   * fragile qu'une liste explicite.
   */
  async staleRevisionIds(db: DbOrTx, pageId: number): Promise<number[]> {
    const rows = await db
      .select()
      .from(cmsPageRevisionsTable)
      .where(eq(cmsPageRevisionsTable.pageId, pageId))
      .orderBy(desc(cmsPageRevisionsTable.revision))
      .all();
    return rows.slice(MAX_REVISIONS_PER_PAGE - 1).map((row) => row.id);
  }

  buildSnapshotStatements(
    db: DbOrTx,
    pageId: number,
    revision: number,
    snapshot: PageSnapshot,
    authorEmail: string,
    reason: string,
    staleIds: number[],
    now: Date
  ) {
    const statements: unknown[] = [
      db.insert(cmsPageRevisionsTable).values({
        pageId,
        revision,
        snapshot: JSON.stringify(snapshot),
        authorEmail,
        reason,
        createdAt: now
      })
    ];
    if (staleIds.length > 0) {
      statements.push(db.delete(cmsPageRevisionsTable).where(inArray(cmsPageRevisionsTable.id, staleIds)));
    }
    return statements;
  }

  /**
   * Prépare le remplacement intégral des blocs d'une page.
   *
   * Renvoie des instructions plutôt que de les exécuter : D1 n'a pas de transaction
   * interactive (ADR-0002), et seul un `db.batch()` est atomique. Le `DELETE` et les
   * `INSERT` doivent partir ensemble, sans quoi l'index unique `(page_id, position)`
   * ferait échouer la moitié des insertions sur les positions déjà occupées.
   */
  buildReplaceStatements(db: DbOrTx, pageId: number, blocks: BlockPayload[], updatedAt: Date) {
    const statements: unknown[] = [
      db.delete(cmsPageBlocksTable).where(eq(cmsPageBlocksTable.pageId, pageId))
    ];

    blocks.forEach((block, position) => {
      statements.push(
        db.insert(cmsPageBlocksTable).values({
          pageId,
          position,
          type: block.type,
          payload: JSON.stringify(block)
        })
      );
    });

    // La page porte la date de dernière modification : c'est elle qui alimente le
    // `lastmod` du sitemap, et modifier un bloc modifie bien la page.
    statements.push(
      db.update(cmsPagesTable).set({ updatedAt }).where(eq(cmsPagesTable.id, pageId))
    );

    return statements;
  }
}
