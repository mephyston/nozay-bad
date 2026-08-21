import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { uploadMemberPhoto } from './handler';
import { uploadMemberPhotoParamSchema } from './validator';
import { photoTranscoder, r2PhotoStore } from '../shared/photo-store';

export type Bindings = { DB: D1Database; MEDIA: R2Bucket; IMAGES?: ImagesBinding };

export const uploadMemberPhotoRoute = new Hono<{ Bindings: Bindings }>();

uploadMemberPhotoRoute.post(
  '/:licence/photo',
  tbValidator('param', uploadMemberPhotoParamSchema, (result, c) => {
    if (!result.success) return c.json({ success: false, error: 'Licence invalide' }, 400);
  }),
  async (c) => {
    if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    if (!c.env?.MEDIA) return c.json({ success: false, error: 'Bucket binding MEDIA is missing' }, 500);

    const { licence } = c.req.valid('param');
    const form = await c.req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return c.json({ success: false, error: 'Aucun fichier reçu' }, 400);

    const data = await uploadMemberPhoto(
      createDb(c.env.DB),
      r2PhotoStore(c.env.MEDIA),
      { licence, bytes: await file.arrayBuffer(), mimeType: file.type },
      // `c.env?.` et non `c.env.` : c'est cette forme que reconnaît
      // `scripts/check-env-declarations.js`, qui vérifie que tout binding utilisé est
      // bien déclaré. Sans le `?.`, le binding échapperait à la vérification.
      c.env?.IMAGES ? photoTranscoder(c.env.IMAGES) : undefined
    );

    return c.json({ success: true, data });
  }
);
