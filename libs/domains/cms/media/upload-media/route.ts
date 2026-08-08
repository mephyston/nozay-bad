import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { uploadMedia } from './handler';
import type { MediaStore } from './dto';

export type Bindings = { DB: D1Database; MEDIA: R2Bucket };

export const uploadMediaRoute = new Hono<{ Bindings: Bindings }>();

/** Adaptateur R2, pour que le handler ignore tout de l'objet-store. */
function r2Store(bucket: R2Bucket): MediaStore {
  return {
    async has(key) {
      return (await bucket.head(key)) !== null;
    },
    async put(key, bytes, mimeType) {
      await bucket.put(key, bytes, { httpMetadata: { contentType: mimeType } });
    }
  };
}

uploadMediaRoute.post('/media', async (c) => {
  if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  if (!c.env?.MEDIA) return c.json({ success: false, error: 'Bucket binding MEDIA is missing' }, 500);

  const form = await c.req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) return c.json({ success: false, error: 'Aucun fichier reçu' }, 400);

  const toInt = (value: FormDataEntryValue | null) => {
    const n = Number(value);
    return Number.isSafeInteger(n) && n > 0 ? n : undefined;
  };

  const db = createDb(c.env.DB);
  const media = await uploadMedia(db, r2Store(c.env.MEDIA), {
    bytes: await file.arrayBuffer(),
    mimeType: file.type,
    width: toInt(form.get('width')),
    height: toInt(form.get('height')),
    alt: (form.get('alt') as string) ?? '',
    title: (form.get('title') as string) ?? undefined
  });

  return c.json({ success: true, data: media });
});
