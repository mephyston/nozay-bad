import type { APIRoute } from 'astro';
import { relay } from '../../lib/relay';
import { json } from '../../lib/http';

/**
 * Le navigateur n'atteint jamais l'API : ce relais la joint avec la clé interne. Seules les
 * routes qui nomment l'appelant `caisse` répondent (route-permissions.ts).
 */
const handler: APIRoute = async ({ params, request, locals, url }) => {
  const path = params.path ?? '';
  if (!/^[a-z0-9/-]+$/.test(path)) return json({ success: false, error: 'Chemin invalide.' }, 400);
  const body = request.method === 'GET' ? undefined : await request.text();
  const res = await relay(locals, `${path}${url.search}`, {
    method: request.method,
    headers: { 'Content-Type': 'application/json' },
    body
  });
  return new Response(await res.text(), { status: res.status, headers: { 'Content-Type': 'application/json' } });
};

export const GET = handler;
export const POST = handler;
