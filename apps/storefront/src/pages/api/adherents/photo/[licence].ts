import type { APIRoute } from 'astro';
import { createApiClient } from '@nba/api-client';
import { resolveEnv, json } from '../../../../lib/request-context';

/**
 * Sert le portrait d'un adhérent, session obligatoire.
 *
 * **Sous `/api/` volontairement.** Le middleware laisse passer sans session toute URL
 * qui ressemble à un fichier statique (`.webp`, `.png`…) — sauf sous `/api/`. Une route
 * nommée `[licence].webp.ts` servirait donc les portraits du club à qui les demande, et
 * ruinerait la raison d'être du préfixe R2 privé.
 *
 * La réponse est mise en cache par le navigateur pour un an, `private` : l'appelant fait
 * varier l'adresse avec `?v=<photoUpdatedAt>`, si bien qu'un portrait remplacé change
 * d'URL et qu'il n'y a rien à invalider.
 */
export const GET: APIRoute = async ({ locals, params, url }) => {
  const session = (locals as any).session;
  if (!session?.activeMemberId) return json({ ok: false, error: 'Non authentifié.' }, 401);

  const licence = String(params.licence ?? '').replace(/\D/g, '');
  if (!licence) return json({ ok: false, error: 'Licence invalide.' }, 400);

  const size = url.searchParams.get('size') === '128' ? '128' : '512';
  const api = createApiClient(resolveEnv(locals));
  const res = await api.fetch(`http://localhost/members/${licence}/photo?size=${size}`);

  if (!res.ok) return json({ ok: false, error: 'Aucune photo.' }, res.status);

  const headers = new Headers({
    'Content-Type': res.headers.get('Content-Type') ?? 'image/webp',
    'Cache-Control': 'private, max-age=31536000, immutable'
  });
  const etag = res.headers.get('ETag');
  if (etag) headers.set('ETag', etag);

  return new Response(res.body, { status: 200, headers });
};
