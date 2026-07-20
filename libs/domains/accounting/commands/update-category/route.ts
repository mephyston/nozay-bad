import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { updateCategory } from './handler';

export type Bindings = {
  DB: D1Database;
};

export const updateCategoryRoute = new Hono<{ Bindings: Bindings }>();

updateCategoryRoute.put('/categories/:id', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const id = parseInt(c.req.param('id'));
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  try {
    const updated = await updateCategory(db, id, body);
    if (!updated) {
      return c.json({ success: false, error: 'Catégorie introuvable' }, 404);
    }
    return c.json({ success: true, data: updated });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 400);
  }
});
