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
  SITE_URL?: string;
  APP_ENV?: string;
}

function client(env: WebsiteEnv) {
  return createApiClient(env as never, { caller: 'website' });
}

/** Enveloppe de réponse commune à toute l'API. */
interface Envelope<T> {
  success: boolean;
  data?: T;
  error?: string;
}

async function getJson<T>(env: WebsiteEnv, path: string): Promise<T | null> {
  const response = await client(env).fetch(`http://localhost${path}`);
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
export async function resolvePublicRoute(env: WebsiteEnv, path: string): Promise<ResolveRouteOutput> {
  const resolved = await getJson<ResolveRouteOutput>(env, `/cms/route?path=${encodeURIComponent(path)}`);
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
