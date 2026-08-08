import { type Db } from '@nba/db';
import { normaliseBlockPayload } from '../../shared/block-payload';
import { CmsPageNotFoundError } from '../../shared/errors';
import { bumpContentVersion } from '../../shared/cache-version';
import { SavePageBlocksRepository } from './repository';
import type { SavePageBlocksInput, SavePageBlocksOutput } from './dto';

/**
 * Remplace **tous** les blocs d'une page.
 *
 * Remplacement intégral et non différentiel : l'éditeur envoie l'état complet qu'il
 * affiche. Calculer un différentiel demanderait des identifiants stables côté client
 * et ouvrirait la porte aux écritures concurrentes partielles, pour un gain nul sur
 * des pages de quelques dizaines de blocs.
 *
 * Toutes les charges utiles sont validées **avant** la moindre écriture : un bloc
 * refusé au milieu de la liste ne doit pas laisser la page à moitié enregistrée.
 */
export async function savePageBlocks(
  db: Db,
  input: SavePageBlocksInput,
  now: Date = new Date()
): Promise<SavePageBlocksOutput> {
  const repo = new SavePageBlocksRepository();

  const page = await repo.findPage(db, input.pageId);
  if (!page) throw new CmsPageNotFoundError();

  const blocks = input.blocks.map((block, position) =>
    normaliseBlockPayload(block.type, block.payload, position)
  );

  const statements = repo.buildReplaceStatements(db, page.id, blocks, now);
  await db.batch(statements as never);

  // Le contenu publié a changé : la clé de cache du site doit bouger, sinon la
  // modification reste invisible jusqu'à l'expiration naturelle.
  if (page.status === 'published') await bumpContentVersion(db, now);

  return { pageId: page.id, count: blocks.length };
}
