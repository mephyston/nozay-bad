import { eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { cmsPagesTable, cmsPageBlocksTable, type CmsPageRow } from '../../shared/schema';
import type { BlockPayload } from '../../shared/blocks';

export class SavePageBlocksRepository {
  async findPage(db: DbOrTx, id: number): Promise<CmsPageRow | undefined> {
    return db.select().from(cmsPagesTable).where(eq(cmsPagesTable.id, id)).get();
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
