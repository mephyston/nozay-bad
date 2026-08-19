import { type Db } from '@nba/db';
import { AppError } from '@nba/db';
import { CmsPageNotFoundError } from '../../shared/errors';
import { bumpContentVersion } from '../../shared/cache-version';
import { DeletePageRepository } from './repository';
import type { DeletePageInput, DeletePageOutput } from './dto';

/**
 * Supprime une page.
 *
 * Une page qui a des sous-pages est refusée : la contrainte de clé étrangère les
 * détacherait silencieusement vers la racine (`ON DELETE set null`), et leurs chemins
 * deviendraient faux sans que personne ne s'en aperçoive.
 */
export async function deletePage(
  db: Db,
  input: DeletePageInput,
  now: Date = new Date()
): Promise<DeletePageOutput> {
  const repo = new DeletePageRepository();

  const page = await repo.findById(db, input.pageId);
  if (!page) throw new CmsPageNotFoundError();

  if ((await repo.countChildren(db, page.id)) > 0) {
    throw new AppError(
      'Cette page a des sous-pages. Déplacez-les ou supprimez-les avant de supprimer la page.',
      409
    );
  }

  await repo.remove(db, page.id);
  if (page.status === 'published') await bumpContentVersion(db, now);

  return { deleted: true, path: page.path };
}
