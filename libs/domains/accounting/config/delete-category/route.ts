import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { deleteCategory } from './handler';
import { deleteCategoryParamSchema } from './validator';

export type Bindings = {
  DB: D1Database;
};

export const deleteCategoryRoute = new Hono<{ Bindings: Bindings }>();

deleteCategoryRoute.delete(
  '/categories/:id',
  tbValidator('param', deleteCategoryParamSchema, (result, c) => {
    if (!result.success) {
      return c.json({ success: false, error: 'Validation failed: ' + [...result.errors].map(e => `${(e as any).path || (e as any).instancePath?.replace(/^\//, '') || 'field'}: ${e.message}`).join(', ') }, 400);
    }
  }),
  async (c) => {
    if (!c.env || !c.env.DB) {
      return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    }
    const { id: idStr } = c.req.valid('param');
    const id = parseInt(idStr, 10);
    const db = createDb(c.env.DB);
    try {
      const deleted = await deleteCategory(db, id);
      if (!deleted) {
        return c.json({ success: false, error: 'Catégorie introuvable' }, 404);
      }
      return c.json({ success: true, data: deleted });
    } catch (err: unknown) {
      return c.json({ success: false, error: (err as Error).message }, 400);
    }
  }
);
