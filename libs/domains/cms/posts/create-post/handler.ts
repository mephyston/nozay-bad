import { type Db } from '@nba/db';
import { sanitizeRichText, CMS_PROFILE } from '@nba/html';
import { slugify, assertValidSlug, normalisePath } from '../../shared/slug';
import { CmsInvalidSlugError, CmsPathConflictError } from '../../shared/errors';
import { CreatePostRepository } from './repository';
import type { CreatePostInput, CreatePostOutput } from './dto';

/**
 * Crée une actualité, en brouillon sauf reprise explicite.
 *
 * Les articles vivent à plat, sans préfixe d'URL : c'est la forme héritée de
 * WordPress, et c'est elle qui est indexée. Ils partagent donc l'espace des adresses
 * avec les pages, d'où le contrôle croisé avant écriture.
 */
export async function createPost(
  db: Db,
  input: CreatePostInput,
  author: { email: string; name: string },
  now: Date = new Date()
): Promise<CreatePostOutput> {
  const repo = new CreatePostRepository();

  const slug = input.slug ? input.slug : slugify(input.title);
  if (!slug) throw new CmsInvalidSlugError();
  assertValidSlug(slug);

  const path = normalisePath(`/${slug}/`);
  if (await repo.pathTaken(db, path)) throw new CmsPathConflictError(path);

  const bodyHtml = input.bodyHtml ? sanitizeRichText(input.bodyHtml, CMS_PROFILE) : '';

  const post = await repo.insert(db, {
    slug,
    path,
    title: input.title,
    excerpt: input.excerpt ?? null,
    bodyHtml,
    coverMediaId: null,
    // L'import fournit sa propre date ; une saisie manuelle démarre en brouillon.
    status: input.publishedAt ? 'published' : 'draft',
    seoTitle: null,
    seoDescription: null,
    authorName: author.name || author.email,
    authorEmail: author.email,
    publishedAt: input.publishedAt ?? null,
    legacyWpId: input.legacyWpId ?? null,
    createdAt: now,
    updatedAt: now
  });

  await repo.linkCategories(db, post.id, input.categoryIds ?? []);
  return post;
}
