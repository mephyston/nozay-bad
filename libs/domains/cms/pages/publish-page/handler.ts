import { type Db } from '@nba/db';
import { CmsPageNotFoundError } from '../../shared/errors';
import { bumpContentVersion } from '../../shared/cache-version';
import { PublishPageRepository } from './repository';
import type { PublishPageInput, PublishPageOutput } from './dto';

/**
 * Publie ou dépublie une page.
 *
 * `publishedAt` n'est posé qu'à la **première** publication : une page corrigée puis
 * republiée garde sa date d'origine, sinon elle remonterait en tête des listes et son
 * `datePublished` mentirait à Google.
 */
export async function publishPage(
  db: Db,
  input: PublishPageInput,
  now: Date = new Date()
): Promise<PublishPageOutput> {
  const repo = new PublishPageRepository();

  const page = await repo.findById(db, input.pageId);
  if (!page) throw new CmsPageNotFoundError();

  const updated = await repo.setStatus(db, page.id, {
    status: input.published ? 'published' : 'draft',
    publishedAt: input.published ? (page.publishedAt ?? now) : page.publishedAt,
    updatedAt: now
  });

  // Publier comme dépublier change ce que voit le visiteur : dans les deux cas le
  // cache du site doit être renouvelé.
  await bumpContentVersion(db, now);

  return updated;
}
