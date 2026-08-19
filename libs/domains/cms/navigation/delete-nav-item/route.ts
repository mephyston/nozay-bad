import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { deleteNavItem } from './handler';

export type Bindings = { DB: D1Database };

export const deleteNavItemRoute = new Hono<{ Bindings: Bindings }>();

deleteNavItemRoute.delete('/nav/:id', async (c) => {
  if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  const navItemId = Number(c.req.param('id'));
  if (!Number.isSafeInteger(navItemId) || navItemId < 1) {
    return c.json({ success: false, error: "Identifiant d'entrée de menu invalide" }, 400);
  }
  const db = createDb(c.env.DB);
  return c.json({ success: true, data: await deleteNavItem(db, { navItemId }) });
});
