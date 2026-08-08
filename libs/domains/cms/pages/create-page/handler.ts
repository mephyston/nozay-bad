import { type Db } from '@nba/db';
import { buildPath, slugify, assertValidSlug } from '../../shared/slug';
import { CmsPageNotFoundError, CmsPathConflictError, CmsInvalidSlugError } from '../../shared/errors';
import { CreatePageRepository } from './repository';
import type { CreatePageInput, CreatePageOutput } from './dto';

/**
 * Crée une page, toujours en brouillon.
 *
 * Jamais publiée d'emblée : une page vide qui apparaît en ligne le temps d'être
 * rédigée serait indexée dans cet état. La publication est un acte séparé.
 */
export async function createPage(
  db: Db,
  input: CreatePageInput,
  authorEmail: string,
  now: Date = new Date()
): Promise<CreatePageOutput> {
  const repo = new CreatePageRepository();

  const slug = input.slug ? input.slug : slugify(input.title);
  // Un titre entièrement composé de ponctuation ne produit aucun slug exploitable.
  if (!slug) throw new CmsInvalidSlugError();
  assertValidSlug(slug);

  let parentPath: string | null = null;
  if (input.parentId != null) {
    const parent = await repo.findById(db, input.parentId);
    if (!parent) throw new CmsPageNotFoundError('Page parente introuvable');
    parentPath = parent.path;
  }

  const path = buildPath(parentPath, slug);

  // Contrôle explicite avant écriture : l'index unique protège la donnée, mais son
  // erreur ne dit pas *quelle* page occupe déjà l'adresse.
  if (await repo.findByPath(db, path)) throw new CmsPathConflictError(path);

  return repo.insert(db, {
    slug,
    path,
    parentId: input.parentId ?? null,
    title: input.title,
    status: 'draft',
    template: input.template ?? 'default',
    seoTitle: input.seoTitle ?? null,
    seoDescription: input.seoDescription ?? null,
    noindex: input.noindex ?? false,
    navOrder: 0,
    publishedAt: null,
    updatedByEmail: authorEmail,
    createdAt: now,
    updatedAt: now
  });
}
