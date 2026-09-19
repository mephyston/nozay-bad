import type { APIRoute } from 'astro';
import { resolveEnv } from '../../lib/request-context';
import { searchSite } from '../../lib/search';
import { allowSearch, cleanQuery, NO_STORE, SEARCH_MIN_LENGTH } from '../../lib/search-guard';

/**
 * La recherche de la loupe : JSON, jamais mis en cache, limité par adresse.
 *
 * `.json` dans le nom : le site impose la barre oblique finale à tout chemin sans
 * extension (`routing.ts`), et `/api/search` répondrait 301 avant d'avoir cherché.
 */
export const GET: APIRoute = async ({ url, request, locals }) => {
  const env = resolveEnv(locals);
  const q = cleanQuery(url.searchParams.get('q'));
  const headers = { 'Content-Type': 'application/json', ...NO_STORE };

  if (q.length < SEARCH_MIN_LENGTH) return new Response(JSON.stringify({ success: true, data: null }), { headers });
  if (!(await allowSearch(env as never, request))) {
    return new Response(JSON.stringify({ success: false, error: 'Trop de recherches : réessayez dans une minute.' }), { status: 429, headers: { ...headers, 'Retry-After': '60' } });
  }

  const groups = await searchSite(env, q);
  const data = Object.fromEntries(groups.map((g) => [`${g.kind}s`, g.hits]));
  return new Response(JSON.stringify({ success: true, data }), { headers });
};
