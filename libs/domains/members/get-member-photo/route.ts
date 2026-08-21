import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { getMemberPhoto } from './handler';
import { DEFAULT_PHOTO_SIZE, isPhotoSize } from '../shared/photo';

export type Bindings = { DB: D1Database; MEDIA: R2Bucket };

export const getMemberPhotoRoute = new Hono<{ Bindings: Bindings }>();

/**
 * Sert les octets d'un portrait.
 *
 * `private` : la réponse traverse un relais authentifié (espace adhérent, administration)
 * et ne doit jamais atterrir dans un cache partagé. L'année de fraîcheur ne vaut que
 * pour le navigateur, et l'appelant fait varier l'URL avec `?v=<photoUpdatedAt>` — une
 * photo remplacée change donc d'adresse, il n'y a rien à invalider.
 */
const PHOTO_CACHE_CONTROL = 'private, max-age=31536000, immutable';

getMemberPhotoRoute.get('/:licence/photo', async (c) => {
  if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  if (!c.env?.MEDIA) return c.json({ success: false, error: 'Bucket binding MEDIA is missing' }, 500);

  const requested = Number(c.req.query('size'));
  const size = isPhotoSize(requested) ? requested : DEFAULT_PHOTO_SIZE;

  const { keys, photoUpdatedAt } = await getMemberPhoto(createDb(c.env.DB), {
    licence: c.req.param('licence'),
    size
  });

  for (const key of keys) {
    const object = await c.env.MEDIA.get(key);
    if (!object) continue;

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('Cache-Control', PHOTO_CACHE_CONTROL);
    if (photoUpdatedAt) headers.set('Last-Modified', new Date(photoUpdatedAt).toUTCString());
    return new Response(object.body, { status: 200, headers });
  }

  // La ligne annonce un portrait que le bucket n'a pas : dépôt interrompu entre R2 et
  // D1, ou objet retiré à la main. Un 404 est plus juste qu'une erreur serveur, et
  // l'appelant retombe sur les initiales.
  return c.json({ success: false, error: 'Aucune photo pour cet adhérent.' }, 404);
});
