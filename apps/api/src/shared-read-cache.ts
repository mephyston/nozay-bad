import type { Context, Next } from 'hono';

/**
 * Cache de réponse des lectures partagées.
 *
 * Mesuré en production : `/members/birthdays` lit 538 lignes — la table
 * `memberships ⋈ persons` entière, dont les dates sont ensuite filtrées en JavaScript —
 * et le fait à **chaque** affichage de la page d'accueil de l'espace adhérent, pour un
 * résultat qui ne change qu'une fois par jour. À deux cents adhérents et trois visites
 * quotidiennes, c'est 320 000 lignes par jour pour un encart d'anniversaires, à prendre
 * sur les 5 millions qu'accorde le plan gratuit de D1.
 *
 * Le cache vit ici et non dans le storefront parce que les mêmes ressources sont lues
 * par trois applications : le site public (qui a déjà le sien, versionné), l'espace
 * adhérent (qui n'en a aucun) et l'administration. Un seul cache, là où la donnée est
 * produite, les sert toutes.
 *
 * **Posé après `authorize()`** : une réponse mise de côté ne peut donc jamais être
 * servie à un appelant qui n'avait pas le droit de la demander, le refus intervenant
 * avant.
 *
 * **La clé porte `x-caller`**, parce que la réponse en dépend : `list-schedule-slots`
 * ajoute les créneaux inactifs pour l'administration, `list-posts` ne sort les
 * brouillons que pour elle, et les actualités réservées ne descendent pas jusqu'au site
 * public. Confondre deux appelants dans une même entrée divulguerait précisément ce que
 * ces gardes protègent.
 *
 * **L'administration n'est jamais servie depuis le cache**, même sous une clé distincte :
 * c'est là qu'on modifie les données, et « je viens d'enregistrer, je ne le vois pas »
 * est un prix qu'aucun cache ne vaut. Elle lit toujours la base.
 *
 * Il n'y a donc pas d'invalidation à l'écriture : le TTL est la seule garantie — court
 * pour ce qui se retouche en séance, long pour ce qui ne bouge qu'au jour le jour.
 */

/**
 * Chemins **exacts**, jamais des préfixes.
 *
 * `/teams/my-fixtures` est propre à un adhérent et `/teams/players/:licence` multiplie
 * les clés sans rien mutualiser : un filet par préfixe les attraperait tous les deux.
 * Ne figurent ici que des routes ouvertes aux appelants de service (`service: true`
 * dans `route-permissions.ts`) — les autres ne sont demandées que par l'administration,
 * qui ne lit jamais le cache.
 */
const CACHED_READS = new Map<string, number>([
  // Les moyens de paiement que la boutique propose : lus à chaque affichage du catalogue.
  ['/accounting/payment-methods', 300],
  ['/members/birthdays', 3600],
  ['/cms/posts/announcements', 300],
  ['/schedules', 300],
  ['/schedules/venues', 300],
  ['/shop/products', 300],
  ['/teams', 300],
  ['/teams/days', 300],
  ['/teams/players', 300]
]);

/** Hôte fictif des clés, comme `cache.local` côté site public — aucun DNS derrière. */
const CACHE_HOST = 'https://api-cache.local';

/** Sous-ensemble de l'API Cache réellement utilisé — ce qu'un test doit fournir. */
export interface ResponseCache {
  match(request: Request): Promise<Response | undefined>;
  put(request: Request, response: Response): Promise<void>;
}

export type SharedReadCacheBindings = Record<string, unknown>;

/** Durée de conservation d'une lecture, ou `undefined` si elle n'est pas cachée. */
export function cachedReadTtl(method: string, path: string): number | undefined {
  if (method !== 'GET') return undefined;
  // Une barre oblique finale désigne la même ressource : la laisser passer créerait
  // deux entrées pour une seule réponse, et l'une des deux ne serait jamais lue.
  const normalized = path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;
  return CACHED_READS.get(normalized);
}

/**
 * Clé de cache : l'appelant, le chemin, puis la requête **triée**.
 *
 * Le tri est ce qui fait qu'un `?limit=5&season=2026` et un `?season=2026&limit=5`
 * partagent leur entrée plutôt que d'en occuper deux.
 */
export function sharedReadKey(caller: string, path: string, search: URLSearchParams): Request {
  const sorted = [...search.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  const query = sorted.length > 0 ? `?${new URLSearchParams(sorted)}` : '';
  return new Request(`${CACHE_HOST}/${encodeURIComponent(caller)}${path}${query}`, {
    method: 'GET'
  });
}

/**
 * Prolonge une écriture de cache au-delà de la réponse.
 *
 * Sous Workers, une promesse laissée flotter est annulée en même temps que la requête :
 * l'entrée ne serait écrite qu'un jour sur deux, sans que rien ne le signale. Hors
 * runtime Workers — les tests — il n'y a rien à prolonger, mais le rejet doit tout de
 * même être absorbé.
 */
function background(c: Context<{ Bindings: SharedReadCacheBindings }>, promise: Promise<unknown>) {
  try {
    c.executionCtx.waitUntil(promise);
  } catch {
    void promise.catch(() => {});
  }
}

export function cacheSharedReads(cacheOverride?: ResponseCache) {
  return async (c: Context<{ Bindings: SharedReadCacheBindings }>, next: Next) => {
    const ttl = cachedReadTtl(c.req.method, c.req.path);
    if (ttl === undefined) return next();

    const caller = c.req.header('x-caller') ?? '';
    if (caller === '' || caller === 'admin') return next();

    // `caches.default` n'existe qu'à l'exécution sous Workers. Son absence doit dégrader
    // vers une lecture directe, jamais faire tomber la route.
    const cache =
      cacheOverride ??
      (globalThis as { caches?: { default?: ResponseCache } }).caches?.default;
    if (!cache) return next();

    const key = sharedReadKey(caller, c.req.path, new URL(c.req.url).searchParams);

    const hit = await cache.match(key).catch(() => undefined);
    if (hit) {
      c.res = new Response(hit.body, hit);
      c.res.headers.set('x-shared-read-cache', 'hit');
      return;
    }

    await next();

    // Un échec n'a rien à faire en cache : il y resterait le temps du TTL, et une panne
    // passagère de la base se transformerait en cinq minutes d'erreur pour tout le monde.
    if (!c.res.ok) return;

    const stored = new Response(c.res.clone().body, c.res);
    stored.headers.set('Cache-Control', `max-age=${ttl}`);
    background(c, cache.put(key, stored));
  };
}
