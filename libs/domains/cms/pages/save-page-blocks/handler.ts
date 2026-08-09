import { type Db } from '@nba/db';
import { normaliseBlockPayload, parseStoredBlock } from '../../shared/block-payload';
import { CmsPageNotFoundError } from '../../shared/errors';
import { bumpContentVersion } from '../../shared/cache-version';
import { snapshotOf } from '../../shared/revision';
import { SavePageBlocksRepository } from './repository';
import type { SavePageBlocksInput, SavePageBlocksOutput } from './dto';

/**
 * Remplace **tous** les blocs d'une page, après en avoir gardé une trace.
 *
 * Remplacement intégral et non différentiel : l'éditeur envoie l'état complet qu'il
 * affiche. Calculer un différentiel demanderait des identifiants stables côté client
 * et ouvrirait la porte aux écritures concurrentes partielles, pour un gain nul sur
 * des pages de quelques dizaines de blocs.
 *
 * Toutes les charges utiles sont validées **avant** la moindre écriture : un bloc
 * refusé au milieu de la liste ne doit pas laisser la page à moitié enregistrée.
 *
 * L'instantané porte l'état **précédent**, pas le nouveau : ce que l'on veut pouvoir
 * retrouver, c'est la version qui marchait.
 */
export async function savePageBlocks(
  db: Db,
  input: SavePageBlocksInput,
  authorEmail = '',
  now: Date = new Date()
): Promise<SavePageBlocksOutput> {
  const repo = new SavePageBlocksRepository();

  const page = await repo.findPage(db, input.pageId);
  if (!page) throw new CmsPageNotFoundError();

  const blocks = input.blocks.map((block, position) =>
    normaliseBlockPayload(block.type, block.payload, position)
  );

  // Instantané de l'état courant, dans le même lot que l'écriture : si le
  // remplacement échoue, aucune révision fantôme ne subsiste.
  const previousRows = await repo.findBlocks(db, page.id);
  const previousBlocks = previousRows
    .map((row) => parseStoredBlock(row.type, row.payload))
    .filter((block): block is NonNullable<typeof block> => block !== null);

  const revision = await repo.nextRevisionNumber(db, page.id);
  const staleIds = await repo.staleRevisionIds(db, page.id);

  const statements = [
    ...repo.buildSnapshotStatements(
      db,
      page.id,
      revision,
      snapshotOf(page, previousBlocks),
      authorEmail,
      'modification du contenu',
      staleIds,
      now
    ),
    ...repo.buildReplaceStatements(db, page.id, blocks, now)
  ];

  await db.batch(statements as never);

  // Le contenu publié a changé : la clé de cache du site doit bouger, sinon la
  // modification reste invisible jusqu'à l'expiration naturelle.
  if (page.status === 'published') await bumpContentVersion(db, now);

  return { pageId: page.id, count: blocks.length, revision };
}
