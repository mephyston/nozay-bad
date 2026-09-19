import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { removeProductImage, uploadProductImage } from './handler';
import { productImageTranscoder, r2ProductImageStore } from '../shared/images';

export type Bindings = { DB: D1Database; MEDIA: R2Bucket; IMAGES?: ImagesBinding };

export const productImageRoute = new Hono<{ Bindings: Bindings }>();

/** `POST /shop/products/:id/image` (multipart, champ `file`) : dépose ou remplace l'image. */
productImageRoute.post('/products/:id/image', async (c) => {
  if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  if (!c.env?.MEDIA) return c.json({ success: false, error: 'Bucket binding MEDIA is missing' }, 500);

  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) return c.json({ success: false, error: 'Identifiant invalide' }, 400);

  const form = await c.req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) return c.json({ success: false, error: 'Aucun fichier reçu' }, 400);

  const data = await uploadProductImage(
    createDb(c.env.DB),
    r2ProductImageStore(c.env.MEDIA),
    id,
    await file.arrayBuffer(),
    // `c.env?.` : c'est cette forme que reconnaît `scripts/check-env-declarations.js`.
    c.env?.IMAGES ? productImageTranscoder(c.env.IMAGES) : undefined
  );
  return c.json({ success: true, data });
});

productImageRoute.delete('/products/:id/image', async (c) => {
  if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) return c.json({ success: false, error: 'Identifiant invalide' }, 400);
  await removeProductImage(createDb(c.env.DB), id);
  return c.json({ success: true });
});
