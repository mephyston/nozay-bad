import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { notifyPost } from './handler';

export type Bindings = { DB: D1Database };

export const notifyPostRoute = new Hono<{ Bindings: Bindings }>();

notifyPostRoute.post('/posts/:id/notify', async (c) => {
  if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);

  const id = Number(c.req.param('id'));
  if (!Number.isSafeInteger(id) || id < 1) {
    return c.json({ success: false, error: 'Identifiant invalide' }, 400);
  }

  const result = await notifyPost(createDb(c.env.DB), id);
  return c.json({ success: true, data: result });
});
