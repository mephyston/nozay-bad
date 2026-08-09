import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { listPageRedirects } from './handler';

export type Bindings = { DB: D1Database };

export const listPageRedirectsRoute = new Hono<{ Bindings: Bindings }>();

listPageRedirectsRoute.get('/redirects', async (c) => {
  if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  const toPath = c.req.query('toPath');
  if (!toPath) return c.json({ success: false, error: 'Paramètre toPath requis' }, 400);
  const db = createDb(c.env.DB);
  return c.json({ success: true, data: await listPageRedirects(db, { toPath }) });
});
