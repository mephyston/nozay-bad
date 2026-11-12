import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { listCategoryGroups } from './handler';

export type Bindings = { DB: D1Database };

export const listCategoryGroupsRoute = new Hono<{ Bindings: Bindings }>();

listCategoryGroupsRoute.get('/category-groups', async (c) => {
  if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  return c.json({ success: true, data: await listCategoryGroups(createDb(c.env.DB)) });
});
