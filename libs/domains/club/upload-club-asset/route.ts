import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { addPartnerLogo, removeClubAsset, setPartnerLogos, uploadClubAsset } from './handler';
import { isClubAsset } from '../shared/settings';
import { r2ClubAssetStore } from '../shared/assets';

export type Bindings = { DB: D1Database; MEDIA: R2Bucket };

export const uploadClubAssetRoute = new Hono<{ Bindings: Bindings }>();

async function fileBytes(c: { req: { formData(): Promise<FormData> } }): Promise<ArrayBuffer | null> {
  const form = await c.req.formData();
  const file = form.get('file');
  return file instanceof File ? file.arrayBuffer() : null;
}

/** `POST /club/assets/logo` (multipart, champ `file`) : dépose ou remplace une image. */
uploadClubAssetRoute.post('/assets/:asset', async (c) => {
  if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  if (!c.env?.MEDIA) return c.json({ success: false, error: 'Bucket binding MEDIA is missing' }, 500);

  const asset = c.req.param('asset');
  const bytes = await fileBytes(c);
  if (!bytes) return c.json({ success: false, error: 'Aucun fichier reçu' }, 400);

  const db = createDb(c.env.DB);
  const actorEmail = c.req.header('x-user-email') || '';
  const store = r2ClubAssetStore(c.env.MEDIA);

  if (asset === 'partners') {
    return c.json({ success: true, data: await addPartnerLogo(db, store, bytes, actorEmail) });
  }
  if (!isClubAsset(asset)) return c.json({ success: false, error: 'Image inconnue' }, 404);
  return c.json({ success: true, data: await uploadClubAsset(db, store, asset, bytes, actorEmail) });
});

uploadClubAssetRoute.delete('/assets/:asset', async (c) => {
  if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  const asset = c.req.param('asset');
  if (!isClubAsset(asset)) return c.json({ success: false, error: 'Image inconnue' }, 404);
  const db = createDb(c.env.DB);
  const actorEmail = c.req.header('x-user-email') || '';
  return c.json({ success: true, data: await removeClubAsset(db, asset, actorEmail) });
});

/** `PUT /club/assets/partners` avec `{ keys: [...] }` : ordre et suppression des logos partenaires. */
uploadClubAssetRoute.put('/assets/partners', async (c) => {
  if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  const body = (await c.req.json().catch(() => null)) as { keys?: unknown } | null;
  const keys = Array.isArray(body?.keys) ? body!.keys.filter((k): k is string => typeof k === 'string') : null;
  if (!keys) return c.json({ success: false, error: 'Liste de clés attendue' }, 400);
  const db = createDb(c.env.DB);
  const actorEmail = c.req.header('x-user-email') || '';
  return c.json({ success: true, data: await setPartnerLogos(db, keys, actorEmail) });
});
