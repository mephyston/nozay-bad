import type { APIRoute } from 'astro';
import { env as cfEnv } from 'cloudflare:workers';
import { createApiClient } from '@nba/api-client';
import { resolveEnv } from '../../lib/request-context';

/**
 * La recherche de contenu, relayée à l'API pour l'adhérent connecté.
 *
 * La saison est celle de la session — jamais celle que le client dirait — : c'est
 * elle qui borne l'annuaire et les équipes à ce que l'adhérent joue.
 */
export const GET: APIRoute = async ({ url, locals }) => {
  const session = locals.session;
  if (!session) return new Response(JSON.stringify({ success: false, error: 'Non authentifié.' }), { status: 401, headers: { 'Content-Type': 'application/json' } });

  const q = (url.searchParams.get('q') ?? '').slice(0, 80);
  const query = new URLSearchParams({ q, seasonCode: session.seasonCode ?? '' });
  const api = createApiClient(resolveEnv(locals) ?? cfEnv);
  const res = await api.fetch(`http://localhost/search?${query}`);
  return new Response(await res.text(), {
    status: res.status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store' }
  });
};
