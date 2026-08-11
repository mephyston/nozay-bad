import { createApiClient } from '@nba/api-client';
import type { ResolveRouteOutput } from '@nba/cms/public';

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

async function getJson<T>(env: WebsiteEnv, path: string, previewVerified = false): Promise<T | null> {
  const response = await client(env, previewVerified).fetch(`http://localhost${path}`);
  if (!response.ok) return null;
  const body = (await response.json()) as Envelope<T>;
  return body.success && body.data !== undefined ? body.data : null;
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

/** Identifiants de médias cités par une liste de blocs. */
export function mediaIdsInBlocks(blocks: import('@nba/cms/public').BlockPayload[]): number[] {
  const ids: number[] = [];
  for (const block of blocks) {
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
      ids.push(...block.items.map((c) => c.mediaId).filter((v): v is number => !!v));
    }
  }
  return ids;
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
  categories?: PostCategoryRow[];
}

export interface PostList {
  posts: PostRow[];
  total: number;
}

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
  location: 'header' | 'footer'
): Promise<NavItemView[]> {
  return (await getJson<NavItemView[]>(env, `/cms/nav?location=${location}`)) ?? [];
}

export interface ScheduleSlotView {
  id: number;
  weekday: number;
  startTime: string;
  endTime: string;
  audience: string;
  label: string | null;
  coachName: string | null;
  venue: { name: string; streetAddress: string | null; postalCode: string | null; city: string | null } | null;
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
