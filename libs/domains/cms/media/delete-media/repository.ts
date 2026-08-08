import { eq, or } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import {
  cmsMediaTable, cmsMediaVariantsTable, cmsPagesTable, cmsPostsTable,
  type CmsMediaRow
} from '../../shared/schema';

export class DeleteMediaRepository {
  async findById(db: DbOrTx, id: number): Promise<CmsMediaRow | undefined> {
    return db.select().from(cmsMediaTable).where(eq(cmsMediaTable.id, id)).get();
  }

  /**
   * Le média est-il encore référencé ?
   *
   * Les clés étrangères sont en `set null` : supprimer sans regarder viderait
   * silencieusement l'image de partage d'une page ou la couverture d'un article.
   */
  async countDirectReferences(db: DbOrTx, id: number): Promise<number> {
    const pages = await db.select().from(cmsPagesTable).where(eq(cmsPagesTable.ogImageMediaId, id)).all();
    const posts = await db.select().from(cmsPostsTable).where(eq(cmsPostsTable.coverMediaId, id)).all();
    return pages.length + posts.length;
  }

  buildDeleteStatements(db: DbOrTx, id: number) {
    return [
      db.delete(cmsMediaVariantsTable).where(eq(cmsMediaVariantsTable.mediaId, id)),
      db.delete(cmsMediaTable).where(eq(cmsMediaTable.id, id))
    ];
  }
}
