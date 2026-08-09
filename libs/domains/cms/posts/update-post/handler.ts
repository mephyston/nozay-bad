import { type Db, AppError } from '@nba/db';
import { sanitizeRichText, CMS_PROFILE } from '@nba/html';
import { bumpContentVersion } from '../../shared/cache-version';
import { UpdatePostRepository } from './repository';
import type { UpdatePostInput, UpdatePostOutput } from './dto';

/**
 * Modifie une actualité.
 *
 * Le slug n'est volontairement pas modifiable : une actualité publiée est partagée par
 * lien et référencée telle quelle. Changer son adresse casserait les deux, pour un
 * gain esthétique nul.
 */
export async function updatePost(
  db: Db,
  input: UpdatePostInput,
  now: Date = new Date()
): Promise<UpdatePostOutput> {
  const repo = new UpdatePostRepository();

  const post = await repo.findById(db, input.postId);
  if (!post) throw new AppError('Actualité introuvable', 404);

  const values: Partial<typeof post> = {
    title: input.title ?? post.title,
    excerpt: input.excerpt === undefined ? post.excerpt : input.excerpt,
    bodyHtml: input.bodyHtml === undefined ? post.bodyHtml : sanitizeRichText(input.bodyHtml, CMS_PROFILE),
    seoTitle: input.seoTitle === undefined ? post.seoTitle : input.seoTitle,
    seoDescription: input.seoDescription === undefined ? post.seoDescription : input.seoDescription,
    updatedAt: now
  };

  await db.batch(repo.buildUpdateStatements(db, post.id, values, input.categoryIds) as never);
  if (post.status === 'published') await bumpContentVersion(db, now);

  const updated = await repo.findById(db, post.id);
  if (!updated) throw new AppError('Actualité introuvable', 404);
  return updated;
}
