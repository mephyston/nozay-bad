import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { deleteRedirect } from './handler';

export type Bindings = { DB: D1Database };

export const deleteRedirectRoute = new Hono<{ Bindings: Bindings }>();

deleteRedirectRoute.delete('/redirects/:id', async (c) => {
  if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  const redirectId = Number(c.req.param('id'));
  if (!Number.isSafeInteger(redirectId) || redirectId < 1) {
    return c.json({ success: false, error: 'Identifiant de redirection invalide' }, 400);
  }
  const db = createDb(c.env.DB);
  await deleteRedirect(db, redirectId);
  return c.json({ success: true, data: null });
});
