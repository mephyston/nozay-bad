import { type Db, AppError } from '@nba/db';
import { bumpContentVersion } from '../../shared/cache-version';
import { PublishPostRepository } from './repository';
import type { PublishPostInput, PublishPostOutput } from './dto';

/**
 * Publie ou retire une actualité.
 *
 * `publishedAt` n'est posé qu'à la première mise en ligne : une correction ne doit pas
 * faire remonter l'article en tête du flux ni fausser son `datePublished`.
 */
export async function publishPost(
  db: Db, input: PublishPostInput, now: Date = new Date()
): Promise<PublishPostOutput> {
  const repo = new PublishPostRepository();
  const post = await repo.findById(db, input.postId);
  if (!post) throw new AppError('Actualité introuvable', 404);

  const updated = await repo.setStatus(db, post.id, {
    status: input.published ? 'published' : 'draft',
    publishedAt: input.published ? (post.publishedAt ?? now) : post.publishedAt,
    updatedAt: now
  });
  await bumpContentVersion(db, now);
  return updated;
}
