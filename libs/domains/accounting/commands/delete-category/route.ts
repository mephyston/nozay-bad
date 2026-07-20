import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { deleteCategory } from './handler';

export type Bindings = {
  DB: D1Database;
};

export const deleteCategoryRoute = new Hono<{ Bindings: Bindings }>();

deleteCategoryRoute.delete('/categories/:id', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const id = parseInt(c.req.param('id'));
  const db = drizzle(c.env.DB);
  try {
    const deleted = await deleteCategory(db, id);
    if (!deleted) {
      return c.json({ success: false, error: 'Catégorie introuvable' }, 404);
    }
    return c.json({ success: true, data: deleted });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 400);
  }
});
