import { eq, like, ne, and } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { cmsPagesTable, cmsRedirectsTable, type CmsPageRow } from '../../shared/schema';

export class UpdatePageRepository {
  async findById(db: DbOrTx, id: number): Promise<CmsPageRow | undefined> {
    return db.select().from(cmsPagesTable).where(eq(cmsPagesTable.id, id)).get();
  }

  async findByPath(db: DbOrTx, path: string): Promise<CmsPageRow | undefined> {
    return db.select().from(cmsPagesTable).where(eq(cmsPagesTable.path, path)).get();
  }

  /**
   * Toute la descendance d'une page, à n'importe quelle profondeur.
   *
   * Le préfixe de chemin suffit : `path` est dénormalisé et se termine par une barre
   * oblique, donc `/le-club/` ne peut pas capter `/le-club-house/`.
   */
  async findDescendants(db: DbOrTx, path: string): Promise<CmsPageRow[]> {
    return db
      .select()
      .from(cmsPagesTable)
      .where(and(like(cmsPagesTable.path, `${path}%`), ne(cmsPagesTable.path, path)))
      .all();
  }

  /** La page qui porte l'accueil, s'il y en a une. */
  async findHome(db: DbOrTx): Promise<CmsPageRow | undefined> {
    return db.select().from(cmsPagesTable).where(eq(cmsPagesTable.template, 'home')).get();
  }

  buildUpdate(db: DbOrTx, id: number, values: Partial<typeof cmsPagesTable.$inferInsert>) {
    return db.update(cmsPagesTable).set(values).where(eq(cmsPagesTable.id, id));
  }

  /** Repointe vers `to` les redirections qui visaient `from` : jamais de chaîne. */
  buildRetargetRedirects(db: DbOrTx, from: string, to: string) {
    return db.update(cmsRedirectsTable).set({ toPath: to }).where(eq(cmsRedirectsTable.toPath, from));
  }

  /** Supprime la redirection dont la source est devenue la cible : jamais de boucle. */
  buildDropLoopingRedirect(db: DbOrTx, path: string) {
    return db.delete(cmsRedirectsTable).where(eq(cmsRedirectsTable.fromPath, path));
  }

  /**
   * Enregistre l'ancienne adresse.
   *
   * `fromPath` est unique : un chemin déjà redirigé — page renommée deux fois, ou URL
   * héritée de WordPress — voit simplement sa cible mise à jour.
   */
  buildUpsertRedirect(db: DbOrTx, fromPath: string, toPath: string, now: Date) {
    return db
      .insert(cmsRedirectsTable)
      .values({
        fromPath,
        toPath,
        statusCode: 301,
        note: 'Adresse précédente, conservée au renommage de la page.',
        createdAt: now
      })
      .onConflictDoUpdate({ target: cmsRedirectsTable.fromPath, set: { toPath, statusCode: 301 } });
  }
}
