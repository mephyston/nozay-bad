import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { getPost } from './handler';

export type Bindings = { DB: D1Database };

export const getPostRoute = new Hono<{ Bindings: Bindings }>();

getPostRoute.get('/posts/:id', async (c) => {
  if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  const postId = Number(c.req.param('id'));
  if (!Number.isSafeInteger(postId) || postId < 1) {
    return c.json({ success: false, error: "Identifiant d'actualité invalide" }, 400);
  }
  const db = createDb(c.env.DB);
  return c.json({ success: true, data: await getPost(db, { postId }) });
});
