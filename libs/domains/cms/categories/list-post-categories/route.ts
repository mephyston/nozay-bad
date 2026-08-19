import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { listPostCategories } from './handler';

export type Bindings = { DB: D1Database };

export const listPostCategoriesRoute = new Hono<{ Bindings: Bindings }>();

listPostCategoriesRoute.get('/post-categories', async (c) => {
  if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  const db = createDb(c.env.DB);
  return c.json({ success: true, data: await listPostCategories(createDb(c.env.DB)) });
});
