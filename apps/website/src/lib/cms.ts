import { createApiClient } from '@nba/api-client';
import { flattenBlocks, isBlockColumn } from '@nba/cms/public';
import type { ResolveRouteOutput } from '@nba/cms/public';
import { withDataCache } from './cache';
import { markDegraded, markVolatile, renderContextOf } from './render-context';

/**
 * Accès au contenu, via le service binding vers l'API.
 *
 * Le site public n'a ni session ni identité : il s'annonce comme `website`, ce qui
 * suffit à l'API pour ne jamais lui servir de brouillon. La garde vit côté API,
 * pas ici — un oubli de paramètre dans cette couche ne doit rien divulguer.
 */

export interface WebsiteEnv {
  API_SERVICE?: { fetch: typeof fetch };
  API_URL?: string;
  INTERNAL_API_KEY?: string;
  PREVIEW_TOKEN_SECRET?: string;
  SITE_URL?: string;
  APP_ENV?: string;
}

function client(env: WebsiteEnv, previewVerified = false) {
  return createApiClient(env as never, { caller: 'website', previewVerified });
}

/** Enveloppe de réponse commune à toute l'API. */
interface Envelope<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Une lecture, mise en cache au bord et surveillée.
 *
 * Deux choses s'ajoutent ici à l'appel lui-même, et elles valent pour toutes les
 * lectures du site puisqu'elles passent toutes par cette fonction :
 *
 *  - le résultat est rangé sous la version de contenu (`withDataCache`), ce qui évite
 *    de redemander les mêmes menus et les mêmes réglages à chaque rendu ;
 *  - une **panne** marque le rendu comme dégradé, pour que la page servie avec ses
 *    valeurs de repli ne soit pas figée une heure au bord.
 *
 * Panne et absence sont distinguées, et c'est ce qui fait la valeur du signal. Un 404
 * — un média cité par un bloc et supprimé depuis — est une vérité stable : la page
 * doit être servie sans son image *et* mise en cache comme n'importe quelle autre.
 * Une coupure, un 5xx ou une réponse illisible, eux, se répareront tout seuls : rien
 * de ce qu'ils produisent ne doit survivre.
 *
 * Un aperçu n'est jamais rangé : `previewVerified` désigne des brouillons.
 */
async function getJson<T>(
  env: WebsiteEnv,
  path: string,
  previewVerified = false,
  options: { volatile?: boolean } = {}
): Promise<T | null> {
  const context = renderContextOf(env);

  const read = async (): Promise<T | null> => {
    let response: Response;
    try {
      response = await client(env, previewVerified).fetch(`http://localhost${path}`);
    } catch {
      // Liaison de service morte. Un 500 vaudrait ici une page blanche : on rend la
      // page avec ses replis, et le marquage empêche de la ranger.
      markDegraded(env);
      return null;
    }

    // 404 : la seule absence légitime. Tout le reste — 401 mal configuré, 429, 5xx —
    // est une panne, et rien de ce qu'elle produit ne doit être rangé. La distinction
    // porte double depuis que les 404 du site sont mises en cache : sans elle, une API
    // qui répond 403 transformerait le site entier en 404 figées au bord.
    if (response.status !== 404 && !response.ok) {
      markDegraded(env);
      return null;
    }
    if (!response.ok) return null;

    try {
      const body = (await response.json()) as Envelope<T>;
      if (!body.success) {
        markDegraded(env);
        return null;
      }
      return body.data ?? null;
    } catch {
      markDegraded(env);
      return null;
    }
  };

  // Une donnée volatile ne se range pas sous la version : rien ne l'invaliderait.
  const version = previewVerified || options.volatile ? null : (context?.version ?? null);
  return withDataCache(path, version, read, context?.waitUntil);
}

/**
 * Résout une URL publique en un contenu, une redirection, ou rien.
 *
 * Un seul aller-retour : l'API consulte pages, articles et redirections d'un bloc.
 * Une page morte de WordPress ne coûte donc pas trois requêtes.
 */
export async function resolvePublicRoute(
  env: WebsiteEnv,
  path: string,
  previewVerified = false
): Promise<ResolveRouteOutput> {
  const resolved = await getJson<ResolveRouteOutput>(
    env,
    `/cms/route?path=${encodeURIComponent(path)}`,
    previewVerified
  );
  // Une API indisponible ne doit pas se traduire par une page blanche : on rend un
  // 404 propre, que le cache ne retiendra pas puisqu'il n'est pas mis en cache.
  return resolved ?? { kind: 'notfound' };
}

export async function getContentVersion(env: WebsiteEnv): Promise<number> {
  const data = await getJson<{ version: number }>(env, '/cms/content-version');
  return data?.version ?? 1;
}

export interface PageSummary {
  path: string;
  title: string;
  updatedAt: string | number | Date;
  noindex: boolean;
}

export async function listPublishedPages(env: WebsiteEnv): Promise<PageSummary[]> {
  return (await getJson<PageSummary[]>(env, '/cms/pages')) ?? [];
}

export interface MediaWithVariants {
  media: import('@nba/cms/public').CmsMediaRow;
  variants: import('@nba/cms/public').CmsMediaVariantRow[];
}

/**
 * Charge les médias référencés par une page, en une passe.
 *
 * Les blocs ne portent que des identifiants : sans cette résolution, chaque image
 * déclencherait son propre aller-retour, et le rendu perdrait les dimensions dont
 * dépend l'absence de décalage.
 */
export async function loadMedia(env: WebsiteEnv, ids: number[]): Promise<Map<number, MediaWithVariants>> {
  const unique = [...new Set(ids)].filter((id) => Number.isSafeInteger(id) && id > 0);
  const entries = await Promise.all(
    unique.map(async (id) => {
      const found = await getJson<MediaWithVariants>(env, `/cms/media/${id}`);
      return found ? ([id, found] as const) : null;
    })
  );
  return new Map(entries.filter((e): e is NonNullable<typeof e> => e !== null));
}

/**
 * Identifiants de médias cités par une liste de blocs.
 *
 * `flattenBlocks` d'abord : les images d'une galerie ou d'une grille de liens posée
 * dans une colonne se résolvent comme les autres. Sans lui, elles seraient servies
 * sans dimensions ni variantes — une image qui arrive en retard et décale la page.
 */
export function mediaIdsInBlocks(blocks: import('@nba/cms/public').BlockPayload[]): number[] {
  const ids: number[] = [];
  for (const block of flattenBlocks(blocks)) {
    if (block.type === 'hero' && block.mediaId) ids.push(block.mediaId);
    if (block.type === 'gallery') ids.push(...block.mediaIds);
    if (block.type === 'cta_grid') {
      ids.push(...block.items.map((i) => i.mediaId).filter((v): v is number => !!v));
      if (block.backgroundMediaId) ids.push(block.backgroundMediaId);
    }
    if (block.type === 'carousel') {
      ids.push(...block.slides.map((s) => s.mediaId).filter((id) => id > 0));
    }
    if (block.type === 'pdf_link') {
      ids.push(block.mediaId);
      if (block.thumbnailMediaId) ids.push(block.thumbnailMediaId);
    }
    if (block.type === 'person_cards') {
      ids.push(...block.people.map((p) => p.mediaId).filter((v): v is number => !!v));
    }
    if (block.type === 'columns') {
      // Seules les colonnes de texte portent une image en propre ; celles qui hébergent
      // un bloc sont déjà passées par `flattenBlocks` et traitées comme leur type.
      ids.push(
        ...block.items
          .flatMap((c) => (isBlockColumn(c) ? [] : [c.mediaId]))
          .filter((v): v is number => !!v)
      );
    }
  }
  return ids;
}

/**
 * Adresse publique d'un média, depuis sa clé de stockage.
 *
 * La clé porte parfois le préfixe `media/` du bucket, parfois non selon la voie par
 * laquelle elle a été enregistrée ; la route publique, elle, l'ajoute toujours. Une
 * seule définition ici plutôt qu'une réécriture recopiée à chaque endroit qui affiche
 * une image — c'est le genre de détail qui ne se remarque qu'en 404.
 */
export function mediaPath(key: string): string {
  return `/media/${key.replace(/^media\//, '')}`;
}

export interface PostCoverRow {
  id: number;
  key: string;
  alt: string;
  width: number | null;
  height: number | null;
}

export interface PostCategoryRow {
  id: number;
  slug: string;
  name: string;
}

export interface PostRow {
  id: number;
  slug: string;
  path: string;
  title: string;
  excerpt: string | null;
  bodyHtml: string;
  authorName: string;
  publishedAt: string | number | null;
  updatedAt: string | number;
  seoTitle: string | null;
  seoDescription: string | null;
  /** Renvoyés joints par l'API : composer une carte ne coûte aucune requête de plus. */
  cover?: PostCoverRow | null;
  /**
   * Déclinaisons de la couverture, par largeur croissante.
   *
   * Absentes tant que le média n'en a pas — seule la reprise WordPress en produit,
   * l'envoi depuis l'administration pas encore. La carte retombe alors sur
   * l'original, sans `srcset`.
   */
  coverVariants?: import('@nba/cms/public').CmsMediaVariantRow[];
  categories?: PostCategoryRow[];
  /**
   * Rendez-vous de l'agenda que l'actualité annonce, s'il y en a un.
   *
   * Un simple identifiant, rapproché au rendu par l'écran qui affiche les deux — c'est
   * ce qui permet à l'agenda de renvoyer vers l'article, sans que le domaine `events`
   * ait à connaître le CMS.
   */
  eventId?: number | null;
}

export interface PostList {
  posts: PostRow[];
  total: number;
}

/**
 * Combien d'actualités lire pour retrouver celle qui annonce un rendez-vous.
 *
 * Plus large que ce qu'une page affiche : l'article qui annonce une compétition de mars
 * peut dater de janvier. Au-delà de cette fenêtre le lien ne se fait pas — c'est un
 * raccourci vers l'article, jamais le seul chemin qui y mène.
 */
export const ANNOUNCEMENT_LOOKUP_LIMIT = 50;

export async function listPublishedPosts(
  env: WebsiteEnv,
  options: { limit?: number; offset?: number; category?: string } = {}
): Promise<PostList> {
  const params = new URLSearchParams();
  if (options.limit) params.set('limit', String(options.limit));
  if (options.offset) params.set('offset', String(options.offset));
  if (options.category) params.set('category', options.category);
  const query = params.toString();
  return (await getJson<PostList>(env, `/cms/posts${query ? `?${query}` : ''}`)) ?? { posts: [], total: 0 };
}

export async function listPostCategories(
  env: WebsiteEnv
): Promise<{ slug: string; name: string }[]> {
  return (await getJson<{ slug: string; name: string }[]>(env, '/cms/post-categories')) ?? [];
}

export interface NavItemView {
  id: number;
  label: string;
  /** Nul pour un conteneur : une entrée qui regroupe, sans page à elle. */
  href: string | null;
  externalUrl: string | null;
  children: NavItemView[];
}

/**
 * Menu d'un emplacement.
 *
 * Appelé à chaque page : un échec renvoie une liste vide plutôt qu'une erreur, pour
 * qu'une API momentanément indisponible retire la navigation sans emporter le site.
 */
export async function listNavItems(
  env: WebsiteEnv,
  location: 'header' | 'footer' | 'legal'
): Promise<NavItemView[]> {
  return (await getJson<NavItemView[]>(env, `/cms/nav?location=${location}`)) ?? [];
}

/**
 * Réglages du site : ce que le pied de page affiche en propre.
 *
 * Rendu sur toutes les pages, donc lu à chaque rendu — mais un rendu ne survient
 * qu'au défaut de cache, et toute écriture de ces réglages incrémente la version de
 * contenu. Une modification est donc visible tout de suite, sans que la lecture pèse
 * sur le trafic servi depuis le bord.
 *
 * Une API indisponible retombe sur les valeurs par défaut plutôt que de vider le pied
 * de page : c'est la même règle que pour les menus.
 */
export interface SiteSettingsView {
  footerDescription: string;
  footerAddress: string;
  instagramUrl: string | null;
  facebookUrl: string | null;
}

/** Repli quand l'API ne répond pas : un pied de page vide plutôt que celui d'un autre club. */
export const SITE_SETTINGS_FALLBACK: SiteSettingsView = {
  footerDescription: '',
  footerAddress: '',
  instagramUrl: null,
  facebookUrl: null
};

export async function getSiteSettings(env: WebsiteEnv): Promise<SiteSettingsView> {
  return (await getJson<SiteSettingsView>(env, '/cms/settings')) ?? SITE_SETTINGS_FALLBACK;
}

export interface ScheduleSlotView {
  id: number;
  weekday: number;
  startTime: string;
  endTime: string;
  audience: string;
  label: string | null;
  coachName: string | null;
  venue: VenueView | null;
}

/**
 * Un gymnase, tel que l'API le renvoie — la ligne `venues` entière.
 *
 * Les coordonnées sont des chaînes, comme en base : elles ne servent qu'aux données
 * structurées, qui les veulent ainsi, et personne ne calcule de distance ici.
 */
export interface VenueView {
  id: number;
  code: string;
  name: string;
  streetAddress: string | null;
  postalCode: string | null;
  city: string | null;
  latitude: string | null;
  longitude: string | null;
}

/**
 * Les gymnases du club, pour la fiche `SportsClub` de l'accueil.
 *
 * Lecture à part des créneaux : l'accueil n'affiche pas forcément de grille, et la
 * fiche du club doit situer ses lieux même sans elle. La route est dans le cache de
 * lecture partagé de l'API, comme `/schedules` — le coût est celui d'un aller-retour,
 * pas d'une requête.
 */
export async function listVenues(env: WebsiteEnv): Promise<VenueView[]> {
  return (await getJson<VenueView[]>(env, '/schedules/venues')) ?? [];
}

export interface ClubEventView {
  id: number;
  slug: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  allDay: boolean;
  category: string;
  venueLabel: string | null;
  descriptionHtml: string | null;
  externalUrl: string | null;
  status: string;
}

export async function listScheduleSlots(
  env: WebsiteEnv,
  options: { audiences?: string[] } = {}
): Promise<ScheduleSlotView[]> {
  const query = options.audiences?.length ? `?audiences=${options.audiences.join(',')}` : '';
  return (await getJson<ScheduleSlotView[]>(env, `/schedules${query}`)) ?? [];
}

export async function listClubEvents(env: WebsiteEnv, limit = 50): Promise<ClubEventView[]> {
  return (await getJson<ClubEventView[]>(env, `/events?limit=${limit}`)) ?? [];
}

/**
 * Une séance de jeu libre, telle que l'API la projette pour le site public.
 *
 * Les noms arrivent **déjà réduits** — « Camille D. » — et les invités seulement
 * comptés : le site ne reçoit jamais de quoi en montrer davantage.
 */
export interface PublicOpenPlaySessionView {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  label: string | null;
  status: 'open' | 'confirmed' | 'cancelled';
  venueName: string | null;
  minPlayers: number;
  playerCount: number;
  guestCount: number;
  players: string[];
  opener: string | null;
}

/**
 * Les prochaines séances de jeu libre, avec leurs inscrits et leur ouvreur.
 *
 * Lecture **volatile** : elle n'est pas rangée sous la version de contenu, que les
 * inscriptions n'incrémentent pas, et elle raccourcit la vie de la page au bord.
 */
export async function listPublicOpenPlay(
  env: WebsiteEnv,
  to: string
): Promise<PublicOpenPlaySessionView[]> {
  markVolatile(env);
  // Lecture par période, au plafond de l'API : c'est la date qui borne, pas un compte.
  const data = await getJson<{ sessions: PublicOpenPlaySessionView[] }>(
    env,
    `/schedules/open-play/public?to=${to}&limit=60`,
    false,
    { volatile: true }
  );
  return data?.sessions ?? [];
}
