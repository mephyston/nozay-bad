/**
 * Cache du site public.
 *
 * C'est le levier le plus important de toute la refonte : l'ancien site WordPress ne
 * mettait rien en cache (`cf-cache-status: DYNAMIC`) et payait ~1,4 s d'origine à
 * chaque visite. Ici, une page publiée est servie depuis le bord.
 *
 * L'invalidation passe par une **version de contenu** intégrée à la clé de cache,
 * faute de purge par étiquette — celle-ci est réservée à l'offre Entreprise.
 * Republier incrémente la version, ce qui rend d'un coup toutes les entrées
 * précédentes inatteignables ; elles s'effacent ensuite d'elles-mêmes.
 */

/** Une heure au bord, une journée de tolérance en révalidation. */
export const HTML_CACHE_CONTROL =
  'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400, stale-if-error=604800';

/** Les médias portent une empreinte de contenu dans leur clé : ils ne changent jamais. */
export const IMMUTABLE_CACHE_CONTROL = 'public, max-age=31536000, immutable';

/**
 * Clé de cache d'une page.
 *
 * Hôte fictif et fixe : la clé ne doit pas dépendre du domaine servi, sans quoi
 * l'apex et la préproduction rempliraient deux caches distincts pour un contenu
 * identique. La chaîne de requête est écartée — aucune de nos pages n'en dépend, et
 * la conserver laisserait n'importe quel `?utm_source=` créer une entrée de plus.
 */
export function cacheKeyFor(pathname: string, version: number): Request {
  return new Request(`https://cache.nozaybad.fr/v${version}${pathname}`, { method: 'GET' });
}

/**
 * Durée pendant laquelle la version de contenu est tenue pour acquise.
 *
 * La clé de cache contient la version, il faut donc la connaître **avant** de
 * chercher : la lire par un appel API à chaque requête annulerait tout le bénéfice,
 * puisqu'un succès de cache coûterait encore un aller-retour. On la range donc
 * elle-même, très brièvement.
 *
 * Dix secondes est le prix de la fraîcheur : c'est le délai maximal entre une
 * publication et son apparition. Assez court pour passer pour instantané, assez long
 * pour absorber une rafale de visites.
 */
const VERSION_TTL_SECONDS = 10;

const VERSION_KEY = 'https://cache.nozaybad.fr/__content-version';

/**
 * Version de contenu, relue au plus une fois toutes les dix secondes par centre de
 * données.
 *
 * @param read Lecture d'autorité, injectée : ce module ne connaît pas l'API.
 */
export async function cachedContentVersion(
  read: () => Promise<number>,
  waitUntil?: (promise: Promise<unknown>) => void
): Promise<number> {
  const store = (globalThis as { caches?: { default?: Cache } }).caches?.default;
  if (!store) return read();

  const key = new Request(VERSION_KEY, { method: 'GET' });
  const hit = await store.match(key);
  if (hit) {
    const parsed = Number(await hit.text());
    if (Number.isSafeInteger(parsed) && parsed > 0) return parsed;
  }

  const version = await read();
  const put = store
    .put(
      key,
      new Response(String(version), {
        headers: { 'Cache-Control': `public, max-age=${VERSION_TTL_SECONDS}` }
      })
    )
    .catch(() => undefined);

  // Jamais de promesse détachée : sans `waitUntil`, le Worker peut être arrêté avant
  // la fin de l'écriture, et le cache ne se remplirait jamais en production.
  if (waitUntil) waitUntil(put);
  else await put;

  return version;
}

interface CacheableOptions {
  pathname: string;
  version: number;
  /** Réservé aux réponses publiques : jamais un brouillon ni une erreur. */
  cacheable: boolean;
  waitUntil?: (promise: Promise<unknown>) => void;
}

/**
 * Sert depuis le cache si possible, sinon rend puis range la réponse.
 *
 * Seules les réponses 200 sont conservées. Mettre en cache une 404 ou une 500
 * figerait une panne transitoire de l'API pour une heure sur tout le réseau.
 */
export async function withPageCache(
  render: () => Promise<Response>,
  options: CacheableOptions
): Promise<Response> {
  const globalCaches = (globalThis as { caches?: { default?: Cache } }).caches;
  const store = globalCaches?.default;

  if (!options.cacheable || !store) {
    const response = await render();
    if (!options.cacheable) response.headers.set('Cache-Control', 'private, no-store');
    return response;
  }

  const key = cacheKeyFor(options.pathname, options.version);

  const hit = await store.match(key);
  if (hit) return hit;

  const response = await render();

  // Seulement du HTML : le middleware enveloppe **toute** requête, or `rss.xml`,
  // `sitemap.xml` et `robots.txt` posent leur propre directive, et `/media/` la sienne,
  // immuable. Écraser celles-là avec la directive des pages serait une régression
  // silencieuse. Le type de contenu est le bon critère : il n'y a pas de liste à tenir.
  const isHtml = (response.headers.get('Content-Type') ?? '').includes('text/html');
  if (response.status === 200 && isHtml) {
    response.headers.set('Cache-Control', HTML_CACHE_CONTROL);
    const copy = response.clone();
    const put = store.put(key, copy).catch(() => undefined);
    if (options.waitUntil) options.waitUntil(put);
    else await put;
  }
  return response;
}
