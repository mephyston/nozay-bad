import { eq, sql } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { cmsContentVersionTable } from './schema';

/**
 * Version du contenu publié.
 *
 * Elle entre dans la clé de cache du site public. L'incrémenter rend d'un coup toutes
 * les entrées précédentes inatteignables — c'est la seule invalidation possible sans
 * la purge par étiquette, réservée à l'offre Entreprise de Cloudflare.
 *
 * Le rayon d'action est volontairement large : une publication invalide tout le site.
 * Sur ~130 URL c'est sans conséquence, et cela supprime toute une classe de « la page
 * ne s'est pas mise à jour ».
 */

export const CONTENT_VERSION_ID = 1;

export async function bumpContentVersion(db: DbOrTx, now: Date = new Date()): Promise<void> {
  await db
    .update(cmsContentVersionTable)
    .set({ version: sql`${cmsContentVersionTable.version} + 1`, updatedAt: now })
    .where(eq(cmsContentVersionTable.id, CONTENT_VERSION_ID))
    .run();
}

export async function getContentVersion(db: DbOrTx): Promise<number> {
  const row = await db
    .select()
    .from(cmsContentVersionTable)
    .where(eq(cmsContentVersionTable.id, CONTENT_VERSION_ID))
    .get();
  // Une base sans la ligne de départ ne doit pas faire tomber le site : servir la
  // version 1 revient à ne pas invalider, ce qui est le comportement le moins nuisible.
  return row?.version ?? 1;
}
