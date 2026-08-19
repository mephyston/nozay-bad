import { CmsInvalidSlugError } from './errors';

/**
 * Slugs et chemins publics.
 *
 * Tous les chemins servis par le site portent une barre oblique finale : c'est la
 * forme héritée de WordPress, et c'est elle qui est indexée par Google. On la conserve
 * partout — en base, dans les redirections, dans le sitemap — pour qu'aucune couche
 * n'ait à deviner laquelle des deux variantes fait foi.
 */

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Chemin racine du site. */
export const ROOT_PATH = '/';

export function assertValidSlug(slug: string): void {
  if (!SLUG.test(slug)) throw new CmsInvalidSlugError();
}

/**
 * Réduit un titre libre à un slug utilisable.
 *
 * Les diacritiques sont décomposés puis retirés : « Présentation » donne
 * « presentation », qui est bien ce que porte l'ancien site.
 */
export function slugify(input: string): string {
  return input
    .normalize('NFD')
    // Marques diacritiques combinantes, notées par leur point de code : une classe
    // portant les caractères littéraux serait illisible et se corromprait à l'édition.
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96);
}

/**
 * Ramène un chemin entrant à la forme unique stockée en base.
 *
 * Sans cette normalisation, `/Presentation`, `/presentation` et `/presentation/`
 * seraient trois lignes distinctes dans la table des redirections, et deux d'entre
 * elles ne serviraient jamais.
 */
export function normalisePath(input: string): string {
  const [withoutQuery] = input.split(/[?#]/);
  const trimmed = withoutQuery.trim().toLowerCase();
  if (trimmed === '' || trimmed === ROOT_PATH) return ROOT_PATH;

  const withLeading = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  const withTrailing = withLeading.endsWith('/') ? withLeading : `${withLeading}/`;
  // Les barres obliques répétées viennent de concaténations maladroites, jamais d'une
  // intention : `//media//x/` et `/media/x/` désignent la même chose.
  return withTrailing.replace(/\/{2,}/g, '/');
}

/**
 * Chemin d'une page, gabarit compris.
 *
 * Le gabarit `home` **désigne la racine** : la page qui le porte est servie à « / »,
 * et son slug n'entre pas dans son adresse. C'est le seul moyen d'atteindre la racine,
 * `buildPath` produisant toujours « /slug/ ». Le slug reste néanmoins stocké : il
 * redevient l'adresse de la page le jour où une autre reprend l'accueil.
 */
export function buildPagePath(
  template: 'default' | 'home' | 'landing',
  parentPath: string | null,
  slug: string
): string {
  assertValidSlug(slug);
  if (template === 'home') return ROOT_PATH;
  return buildPath(parentPath, slug);
}

/** Compose le chemin d'une page à partir de celui de son parent. */
export function buildPath(parentPath: string | null, slug: string): string {
  assertValidSlug(slug);
  const base = parentPath ? normalisePath(parentPath) : ROOT_PATH;
  return normalisePath(`${base}${slug}/`);
}
