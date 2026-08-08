import type { APIRoute } from 'astro';
import { isSafeMediaKey, MEDIA_KEY_PREFIX } from '@nba/cms/public';
import { IMMUTABLE_CACHE_CONTROL } from '../../lib/cache';

/**
 * Sert un média depuis R2.
 *
 * La clé porte l'empreinte du contenu : ce qu'il y a derrière ne change jamais, d'où
 * le cache immuable d'un an. Une image modifiée reçoit une nouvelle clé, donc une
 * nouvelle URL — il n'y a rien à invalider.
 */
export const GET: APIRoute = async ({ params, locals, request }) => {
  const key = params.key ?? '';

  // Le chemin vient de l'URL : sans ce contrôle, un `..` ouvrirait la lecture
  // d'objets hors de la médiathèque.
  if (!isSafeMediaKey(key)) return new Response('Not found', { status: 404 });

  const env = (locals as { runtime?: { env?: { MEDIA?: R2Bucket } } }).runtime?.env;
  if (!env?.MEDIA) return new Response('Media store unavailable', { status: 503 });

  // Les lecteurs de PDF mobiles demandent des plages : sans cela, ils retéléchargent
  // le document entier à chaque saut de page.
  const range = request.headers.get('range');
  const object = await env.MEDIA.get(`${MEDIA_KEY_PREFIX}${key}`, range ? { range: request.headers } : undefined);

  if (!object) return new Response('Not found', { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('Cache-Control', IMMUTABLE_CACHE_CONTROL);
  headers.set('Accept-Ranges', 'bytes');

  const hasRange = object.range !== undefined && range !== null;
  if (hasRange && 'offset' in (object.range ?? {})) {
    const { offset = 0, length = 0 } = object.range as { offset?: number; length?: number };
    headers.set('Content-Range', `bytes ${offset}-${offset + length - 1}/${object.size}`);
  }

  return new Response(object.body, { status: hasRange ? 206 : 200, headers });
};
