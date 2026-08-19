import { type Db, AppError } from '@nba/db';
import { Value } from '@sinclair/typebox/value';
import { CmsPageNotFoundError } from '../../shared/errors';
import { bumpContentVersion } from '../../shared/cache-version';
import { BLOCK_SCHEMAS, type BlockPayload, type BlockType } from '../../shared/blocks';
import { snapshotOf, type PageSnapshot } from '../../shared/revision';
import { SavePageBlocksRepository } from '../../pages/save-page-blocks/repository';
import { parseStoredBlock } from '../../shared/block-payload';
import { RestorePageRevisionRepository } from './repository';
import type { RestorePageRevisionInput, RestorePageRevisionOutput } from './dto';

/**
 * Remet une page dans un état antérieur.
 *
 * L'instantané est relu **et revalidé** : il a pu être écrit par une version plus
 * ancienne du modèle de blocs, et rien ne garantit qu'il satisfasse encore le schéma
 * courant. Un bloc devenu invalide est écarté plutôt que de faire échouer toute la
 * restauration — retrouver une page amputée d'un bloc vaut mieux que ne pas pouvoir
 * la retrouver.
 *
 * La restauration est elle-même capturée : on peut donc revenir sur un retour en
 * arrière, ce qui est exactement ce qu'on cherche quand on s'est trompé de version.
 */
export async function restorePageRevision(
  db: Db,
  input: RestorePageRevisionInput,
  authorEmail = '',
  now: Date = new Date()
): Promise<RestorePageRevisionOutput> {
  const repo = new RestorePageRevisionRepository();
  const saveRepo = new SavePageBlocksRepository();

  const page = await repo.findPage(db, input.pageId);
  if (!page) throw new CmsPageNotFoundError();

  const row = await repo.findRevision(db, page.id, input.revisionId);
  if (!row) throw new AppError('Révision introuvable pour cette page', 404);

  let snapshot: PageSnapshot;
  try {
    snapshot = JSON.parse(row.snapshot) as PageSnapshot;
  } catch {
    throw new AppError('Cette révision est illisible et ne peut pas être restaurée.', 422);
  }

  const blocks = (snapshot.blocks ?? []).filter((block): block is BlockPayload => {
    const schema = BLOCK_SCHEMAS[block?.type as BlockType];
    return Boolean(schema) && Value.Check(schema, block);
  });

  // Instantané de l'état courant avant écrasement, pour que le retour en arrière soit
  // lui aussi réversible.
  const currentRows = await saveRepo.findBlocks(db, page.id);
  const currentBlocks = currentRows
    .map((r) => parseStoredBlock(r.type, r.payload))
    .filter((b): b is NonNullable<typeof b> => b !== null);

  const revision = await saveRepo.nextRevisionNumber(db, page.id);
  const staleIds = await saveRepo.staleRevisionIds(db, page.id);

  const statements = [
    ...saveRepo.buildSnapshotStatements(
      db, page.id, revision, snapshotOf(page, currentBlocks), authorEmail,
      `avant restauration de la version ${row.revision}`, staleIds, now
    ),
    ...repo.buildRestoreStatements(
      db,
      page.id,
      {
        title: snapshot.title ?? page.title,
        seoTitle: snapshot.seoTitle ?? null,
        seoDescription: snapshot.seoDescription ?? null,
        noindex: snapshot.noindex ?? false
      },
      blocks,
      authorEmail,
      now
    )
  ];

  await db.batch(statements as never);
  if (page.status === 'published') await bumpContentVersion(db, now);

  const restored = await repo.findPage(db, page.id);
  if (!restored) throw new CmsPageNotFoundError();
  return restored;
}
