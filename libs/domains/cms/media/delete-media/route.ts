import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { deleteMedia } from './handler';

export type Bindings = { DB: D1Database };

export const deleteMediaRoute = new Hono<{ Bindings: Bindings }>();

deleteMediaRoute.delete('/media/:id', async (c) => {
  if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  const mediaId = Number(c.req.param('id'));
  if (!Number.isSafeInteger(mediaId) || mediaId < 1) {
    return c.json({ success: false, error: 'Identifiant de média invalide' }, 400);
  }
  const db = createDb(c.env.DB);
  return c.json({ success: true, data: await deleteMedia(db, { mediaId }) });
});
