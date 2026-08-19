import { asc, eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { cmsPagesTable, type CmsPageRow } from '../../shared/schema';

export class ListPagesRepository {
  async list(db: DbOrTx, status?: 'draft' | 'published'): Promise<CmsPageRow[]> {
    // Tri par chemin : il reproduit l'arborescence à plat, ce qui donne directement
    // l'ordre d'affichage de l'arbre en administration.
    const query = db.select().from(cmsPagesTable).orderBy(asc(cmsPagesTable.path));
    if (status) return query.where(eq(cmsPagesTable.status, status)).all();
    return query.all();
  }
}
