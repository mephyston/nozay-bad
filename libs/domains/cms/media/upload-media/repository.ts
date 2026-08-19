import { eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { cmsMediaTable, cmsMediaVariantsTable, type CmsMediaRow } from '../../shared/schema';

export class UploadMediaRepository {
  async findByHash(db: DbOrTx, contentHash: string): Promise<CmsMediaRow | undefined> {
    return db.select().from(cmsMediaTable).where(eq(cmsMediaTable.contentHash, contentHash)).get();
  }

  async insert(db: DbOrTx, values: typeof cmsMediaTable.$inferInsert): Promise<CmsMediaRow> {
    const [row] = await db.insert(cmsMediaTable).values(values).returning();
    return row;
  }

  /** Un média a-t-il déjà son échelle ? Décide du rattrapage sur redépôt. */
  async hasVariants(db: DbOrTx, mediaId: number): Promise<boolean> {
    const found = await db
      .select({ id: cmsMediaVariantsTable.id })
      .from(cmsMediaVariantsTable)
      .where(eq(cmsMediaVariantsTable.mediaId, mediaId))
      .get();
    return found !== undefined;
  }

  /**
   * `INSERT OR IGNORE` : la clé porte l'empreinte du contenu et la largeur, donc deux
   * productions de la même variante visent la même ligne. Un rattrapage relancé après
   * une coupure doit repasser sans buter sur l'unicité de `key`.
   */
  async insertVariants(db: DbOrTx, rows: (typeof cmsMediaVariantsTable.$inferInsert)[]): Promise<void> {
    if (rows.length === 0) return;
    await db.insert(cmsMediaVariantsTable).values(rows).onConflictDoNothing();
  }
}
