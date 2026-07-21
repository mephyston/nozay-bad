import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { tbValidator } from '@hono/typebox-validator';
import { updateCategory } from './handler';
import { updateCategorySchema } from './validator';

export type Bindings = {
  DB: D1Database;
};

export const updateCategoryRoute = new Hono<{ Bindings: Bindings }>();

updateCategoryRoute.put(
  '/categories/:id',
  tbValidator('json', updateCategorySchema, (result, c) => {
    if (!result.success) {
      return c.json({ success: false, error: 'Validation failed: ' + [...result.errors].map(e => `${e.instancePath?.replace(/^\//, '') || 'field'}: ${e.message}`).join(', ') }, 400);
    }
  }),
  async (c) => {
    if (!c.env || !c.env.DB) {
      return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    }
    const id = parseInt(c.req.param('id'));
    if (isNaN(id)) {
      return c.json({ success: false, error: 'Identifiant invalide' }, 400);
    }
    const body = c.req.valid('json');
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
  }
);
