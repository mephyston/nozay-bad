import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { deleteCategoryGroup } from './handler';

export type Bindings = { DB: D1Database };

export const deleteCategoryGroupRoute = new Hono<{ Bindings: Bindings }>();

deleteCategoryGroupRoute.delete('/category-groups/:id', async (c) => {
  if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  const id = Number(c.req.param('id'));
  if (!Number.isSafeInteger(id) || id < 1) return c.json({ success: false, error: 'Identifiant invalide' }, 400);
  await deleteCategoryGroup(createDb(c.env.DB), id);
  return c.json({ success: true });
});
