import { Hono } from 'hono';
import { createDb } from '@metacult/shared-db';
import { listCategories } from './handler';

export type Bindings = {
  DB: D1Database;
};

export const listCategoriesRoute = new Hono<{ Bindings: Bindings }>();

listCategoriesRoute.get('/categories', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const db = createDb(c.env.DB);
  try {
    const list = await listCategories(db);
    return c.json({ success: true, data: list });
  } catch (err: unknown) {
    return c.json({ success: false, error: err.message }, 500);
  }
});
