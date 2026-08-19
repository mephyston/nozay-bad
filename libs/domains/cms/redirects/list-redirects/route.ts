import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { listRedirects } from './handler';

export type Bindings = { DB: D1Database };

export const listRedirectsRoute = new Hono<{ Bindings: Bindings }>();

// Segment littéral `/redirects/all`, distinct de `GET /redirects?toPath=` : la table
// des autorisations associe une permission par couple méthode + chemin, et les deux
// usages n'exigent pas le même droit (administration des redirections vs encart de
// l'éditeur de page).
listRedirectsRoute.get('/redirects/all', async (c) => {
  if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  const db = createDb(c.env.DB);
  return c.json({ success: true, data: await listRedirects(db) });
});
