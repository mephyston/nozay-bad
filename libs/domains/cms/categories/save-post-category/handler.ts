import { type Db } from '@nba/db';
import { slugify, assertValidSlug } from '../../shared/slug';
import { CmsInvalidSlugError } from '../../shared/errors';
import { SavePostCategoryRepository } from './repository';
import type { SavePostCategoryInput, SavePostCategoryOutput } from './dto';

/**
 * Crée une catégorie, ou rend celle qui porte déjà ce slug.
 *
 * Idempotent par slug : l'import WordPress rejoue les neuf catégories existantes sans
 * les dupliquer, et une double soumission depuis l'administration reste sans effet.
 */
export async function savePostCategory(
  db: Db, input: SavePostCategoryInput, now: Date = new Date()
): Promise<SavePostCategoryOutput> {
  const repo = new SavePostCategoryRepository();

  const slug = input.slug ? input.slug : slugify(input.name);
  if (!slug) throw new CmsInvalidSlugError();
  assertValidSlug(slug);

  const existing = await repo.findBySlug(db, slug);
  if (existing) return existing;

  return repo.insert(db, {
    slug, name: input.name, description: input.description ?? null, navOrder: 0, createdAt: now
  });
}
