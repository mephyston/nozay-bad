import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { deleteMemberPhoto } from './handler';
import { r2PhotoStore } from '../shared/photo-store';

export type Bindings = { DB: D1Database; MEDIA: R2Bucket };

export const deleteMemberPhotoRoute = new Hono<{ Bindings: Bindings }>();

deleteMemberPhotoRoute.delete('/:licence/photo', async (c) => {
  if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  if (!c.env?.MEDIA) return c.json({ success: false, error: 'Bucket binding MEDIA is missing' }, 500);

  const data = await deleteMemberPhoto(createDb(c.env.DB), r2PhotoStore(c.env.MEDIA), {
    licence: c.req.param('licence')
  });

  return c.json({ success: true, data });
});
