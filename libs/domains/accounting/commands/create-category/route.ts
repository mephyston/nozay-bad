import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { createCategory } from './handler';

export type Bindings = {
  DB: D1Database;
};

export const createCategoryRoute = new Hono<{ Bindings: Bindings }>();

createCategoryRoute.post('/categories', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  try {
    const newCat = await createCategory(db, body);
    return c.json({ success: true, data: newCat });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 400);
  }
});
