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

/**
 * Une heure au bord.
 *
 * `stale-while-revalidate` et `stale-if-error` s'adressent aux caches qui savent les
 * honorer — navigateurs, intermédiaires. L'API Cache d'un Worker, elle, ne révalide
 * rien en arrière-plan : passé l'heure, l'entrée a simplement disparu et la requête
 * suivante paie un rendu complet. Les directives sont conservées parce qu'elles ne
 * coûtent rien et servent en aval ; il ne faut simplement pas compter dessus ici.
 */
export const HTML_CACHE_CONTROL =
  'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400, stale-if-error=604800';

/**
 * Un quart d'heure pour une adresse morte.
 *
 * Les robots sont la première source de 404 : les ~70 pages mortes de WordPress qui
 * traînent encore dans les index, et les scanners qui essaient `/wp-admin/` et
 * `/.env` en rafale. Sans entrée de cache, chacun de ces essais paie un rendu complet
 * et une résolution de route côté API — la charge est décidée par le robot, pas par
 * nous.
 *
 * Le ranger est sans danger parce que la clé porte la version de contenu : publier la
 * page manquante, ou la redirection qui la remplace (`update-page` écrit les deux et
 * incrémente la version), rend l'entrée inatteignable sur-le-champ. Le quart d'heure
 * ne sert qu'à borner ce qu'aucune publication ne viendrait corriger.
 */
export const NOT_FOUND_CACHE_CONTROL = 'public, max-age=0, s-maxage=900';

/** Codes rangés au bord. Une 5xx figerait une panne passagère sur tout le réseau. */
const CACHEABLE_STATUS = new Set([200, 404, 410]);

/**
 * Les médias portent une empreinte de contenu dans leur clé : ils ne changent jamais.
 *
 * D'où l'année côté navigateur — mais un jour seulement côté bord (`s-maxage`). Un
 * média *supprimé*, lui, disparaît de R2 sans que rien n'invalide une entrée dont la
 * clé ne dépend d'aucune version : sans cette borne, une photo retirée de la
 * médiathèque resterait servie un an depuis le cache partagé. Une journée suffit à
 * supprimer l'essentiel des lectures de R2 — au plus une par média, par jour et par
 * centre de données — sans faire du retrait une illusion.
 */
export const IMMUTABLE_CACHE_CONTROL = 'public, max-age=31536000, immutable, s-maxage=86400';

/**
 * Paramètres de requête dont le contenu d'une page dépend réellement.
 *
 * La chaîne de requête était **entièrement** écartée de la clé, au motif qu'aucune
 * page n'en dépendait. `/actualites/` en dépend depuis qu'elle filtre par rubrique et
 * pagine : les deux fonctionnaient en développement, et se seraient tues en
 * production, où la première variante rendue était resservie à toutes les autres.
 *
 * Chaque paramètre porte donc sa règle de canonicalisation. Trois issues :
 *  - une valeur canonique : elle entre dans la clé ;
 *  - `null` : le paramètre ne change pas le rendu (`?page=1` vaut la page nue), il
 *    est omis — deux URL au même contenu partagent alors une seule entrée ;
 *  - `NOT_CACHEABLE` : la valeur change le rendu mais n'est pas canonisable, la
 *    réponse n'est alors pas mise en cache du tout. Faire l'inverse — la ranger sous
 *    une clé qui ignore le paramètre — empoisonnerait l'entrée de la page nue.
 *
 * Tout ce qui n'est pas listé ici est ignoré : `?utm_source=` ne crée pas d'entrée.
 */
const NOT_CACHEABLE = Symbol('not-cacheable');

const QUERY_RULES: Record<string, (raw: string) => string | null | typeof NOT_CACHEABLE> = {
  // Rubrique des actualités : un slug, la forme même des identifiants du CMS. Une
  // valeur d'une autre forme ne correspond à aucune rubrique et rend une liste vide,
  // donc un contenu distinct : elle ne peut ni entrer dans la clé ni en être omise.
  categorie: (raw) => (/^[a-z0-9-]{1,64}$/.test(raw) ? raw : NOT_CACHEABLE),
  // Pagination. La condition reproduit celle de la page : tout ce qui n'est pas un
  // entier supérieur à 1 y retombe sur la première page, donc sur le rendu nu.
  page: (raw) => {
    const value = Number(raw);
    return Number.isSafeInteger(value) && value > 1 ? String(value) : null;
  }
};

/**
 * Chaîne de requête canonique, ou `null` si la réponse ne doit pas être mise en cache.
 *
 * L'ordre vient des règles et non de l'URL : `?page=2&categorie=tournoi` et
 * `?categorie=tournoi&page=2` désignent la même page, donc la même entrée.
 */
export function canonicalQuery(search: URLSearchParams): string | null {
  const kept: string[] = [];
  for (const [key, rule] of Object.entries(QUERY_RULES)) {
    const raw = search.get(key);
    if (raw === null) continue;
    const value = rule(raw.trim());
    if (value === NOT_CACHEABLE) return null;
    if (value !== null) kept.push(`${key}=${value}`);
  }
  return kept.length > 0 ? `?${kept.join('&')}` : '';
}

/**
 * Chemins dont la clé porte déjà une empreinte du contenu.
 *
 * `/media/<clé>/…` est nommé d'après l'empreinte de l'original : une image modifiée
 * reçoit une autre URL. Ranger ces réponses sous la version de contenu ferait donc
 * expirer toute la médiathèque du bord à chaque publication d'un article, pour rien.
 */
export function isFingerprintedPath(pathname: string): boolean {
  return pathname.startsWith('/media/');
}

/**
 * Clé de cache d'une réponse.
 *
 * Hôte fictif et fixe : la clé ne doit pas dépendre du domaine servi, sans quoi
 * l'apex et la préproduction rempliraient deux caches distincts pour un contenu
 * identique.
 *
 * `version` à `null` range hors de tout espace de version — réservé aux chemins
 * empreintés, les seuls qui n'aient rien à invalider.
 */
export function cacheKeyFor(pathname: string, version: number | null, query = ''): Request {
  const prefix = version === null ? '' : `/v${version}`;
  return new Request(`https://cache.nozaybad.fr${prefix}${pathname}${query}`, { method: 'GET' });
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
  /** Chaîne de requête de la demande. Canonicalisée par `canonicalQuery`. */
  search?: URLSearchParams;
  waitUntil?: (promise: Promise<unknown>) => void;
  /**
   * Consulté une fois le rendu **terminé** : une réponse composée de valeurs de repli
   * est servie, jamais rangée. Voir `render-context.ts`.
   */
  isDegraded?: () => boolean;
}

/**
 * Une réponse qui n'est pas du HTML se range-t-elle ?
 *
 * Le middleware enveloppe **toute** requête, `rss.xml`, `sitemap.xml`, `robots.txt` et
 * `/media/` comprises. Chacune pose déjà la durée qui lui convient : la directive
 * qu'elle porte est donc la réponse à la question, et il n'y a pas de liste de chemins
 * à tenir à jour. Sans directive, on s'abstient — le silence n'est pas un accord.
 */
function sharedCacheAllowed(directive: string | null): boolean {
  if (!directive) return false;
  return directive.includes('public') && !directive.includes('no-store') && !directive.includes('private');
}

/**
 * Sert depuis le cache si possible, sinon rend puis range la réponse.
 *
 * Trois codes sont rangés : 200, et les deux réponses définitives que sont 404 et 410
 * — celles-là pour une durée bien plus courte, et parce que ce sont les robots qui
 * les provoquent. Une 5xx, jamais : elle figerait une panne passagère de l'API pour
 * une heure sur tout le réseau.
 *
 * L'écriture est **différée jusqu'à la fin du flux**. Le HTML est produit en continu :
 * quand `render()` rend la main, les composants n'ont pas fini de s'exécuter, et le
 * pied de page — donc ses lectures d'API — n'a encore rien dit de sa santé. Le corps
 * est dupliqué par `tee()` : une branche part au visiteur sans attendre, l'autre est
 * lue jusqu'au bout, et c'est seulement alors que la décision de ranger se prend.
 */
export async function withPageCache(
  render: () => Promise<Response>,
  options: CacheableOptions
): Promise<Response> {
  const globalCaches = (globalThis as { caches?: { default?: Cache } }).caches;
  const store = globalCaches?.default;

  // `null` : la demande porte un paramètre qui change le rendu sans être canonisable
  // (une rubrique qui n'a pas la forme d'un slug). On rend, on ne range rien — et
  // surtout on ne range pas sous la clé de la page nue, qu'on empoisonnerait.
  const query = canonicalQuery(options.search ?? new URLSearchParams());

  if (!options.cacheable || !store || query === null) {
    const response = await render();
    if (!options.cacheable) response.headers.set('Cache-Control', 'private, no-store');
    return response;
  }

  const fingerprinted = isFingerprintedPath(options.pathname);
  const version = fingerprinted ? null : options.version;
  const key = cacheKeyFor(options.pathname, version, query);

  const hit = await store.match(key);
  if (hit) return hit;

  const response = await render();
  const status = response.status;
  if (!CACHEABLE_STATUS.has(status)) return response;

  /*
    Un média absent n'est **jamais** rangé, même quinze minutes.

    Ranger une 404 tient parce que la clé porte la version de contenu : publier la
    page manquante rend l'entrée inatteignable sur-le-champ. Un chemin empreinté n'a
    justement pas de version dans sa clé — c'est tout l'intérêt — donc rien ne vient
    l'invalider, et l'absence d'un média est le cas où cette différence coûte cher :
    déposer le fichier ne le fait pas apparaître. Le média était introuvable à la
    seconde où quelqu'un a demandé son adresse, il le restait un quart d'heure après
    l'avoir déposé, par centre de données — et le réglage « Browser Cache TTL » de la
    zone, qui écrase un `max-age=0`, l'épinglait quatre heures de plus dans le
    navigateur qui avait posé la question. Un dépôt qui semble refusé, alors que le
    fichier est bien en place.

    `no-store` et pas une durée courte : l'absence est un état transitoire, le seul
    qu'un cache ne doit pas apprendre.
  */
  if (fingerprinted && status !== 200) {
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  }

  const isHtml = (response.headers.get('Content-Type') ?? '').includes('text/html');
  if (status !== 200) response.headers.set('Cache-Control', NOT_FOUND_CACHE_CONTROL);
  else if (isHtml) response.headers.set('Cache-Control', HTML_CACHE_CONTROL);
  else if (!sharedCacheAllowed(response.headers.get('Cache-Control'))) return response;

  const headers = new Headers(response.headers);

  // Une 404 n'a souvent pas de corps du tout : rien à drainer, donc rien à attendre.
  if (!response.body) {
    if (!options.isDegraded?.()) {
      const put = store.put(key, new Response(null, { status, headers })).catch(() => undefined);
      if (options.waitUntil) options.waitUntil(put);
      else await put;
    }
    return response;
  }

  const [toVisitor, toCache] = response.body.tee();

  const write = (async () => {
    // Draine la copie : à la fin du flux, tout le rendu a eu lieu.
    const buffer = await new Response(toCache).arrayBuffer();
    if (options.isDegraded?.()) return;
    await store.put(key, new Response(buffer, { status, headers }));
  })().catch(() => undefined);

  if (options.waitUntil) options.waitUntil(write);
  else await write;

  return new Response(toVisitor, { status, headers });
}

/**
 * Durée de vie d'une lecture d'API rangée au bord.
 *
 * Une heure sans risque de servir du vieux : la clé porte la version de contenu, que
 * toute publication incrémente. C'est donc la version, et non ce délai, qui décide de
 * la fraîcheur — le délai ne fait que borner l'occupation du cache.
 */
export const DATA_CACHE_SECONDS = 3600;

/** Clé d'une lecture d'API. Espace séparé : jamais le chemin d'une page servie. */
export function dataCacheKey(path: string, version: number): Request {
  return new Request(`https://cache.nozaybad.fr/data/v${version}${path}`, { method: 'GET' });
}

/**
 * Range le résultat d'une lecture d'API, sous la version de contenu.
 *
 * C'est le levier qui compte pour la charge de l'API : le pied de page et l'en-tête
 * lisent les mêmes menus et les mêmes réglages **à chaque rendu de chaque page**, et
 * un rendu, c'est quatre allers-retours avant même le contenu demandé. Ici, la
 * première page rendue les paie pour toutes les autres — y compris pour les 404, qui
 * ne sont jamais mises en cache et qu'un robot déclenche en rafale.
 *
 * `version` à `null` (aperçu, préproduction, hors Worker) court-circuite tout : un
 * brouillon n'a rien à faire dans un cache partagé.
 *
 * Un échec n'est jamais rangé : `read` rend `null`, et la lecture suivante réessaie.
 */
export async function withDataCache<T>(
  path: string,
  version: number | null,
  read: () => Promise<T | null>,
  waitUntil?: (promise: Promise<unknown>) => void
): Promise<T | null> {
  const store = (globalThis as { caches?: { default?: Cache } }).caches?.default;
  if (!store || version === null) return read();

  const key = dataCacheKey(path, version);
  const hit = await store.match(key);
  if (hit) {
    try {
      return (await hit.json()) as T;
    } catch {
      // Entrée illisible : on la traite comme absente plutôt que d'emporter la page.
    }
  }

  const value = await read();
  if (value === null) return null;

  const put = store
    .put(
      key,
      new Response(JSON.stringify(value), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': `public, max-age=${DATA_CACHE_SECONDS}`
        }
      })
    )
    .catch(() => undefined);

  if (waitUntil) waitUntil(put);
  else await put;

  return value;
}
