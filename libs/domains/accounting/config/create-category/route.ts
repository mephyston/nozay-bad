import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { createCategory } from './handler';
import { createCategorySchema } from './validator';

export type Bindings = {
  DB: D1Database;
};

export const createCategoryRoute = new Hono<{ Bindings: Bindings }>();

createCategoryRoute.post(
  '/categories',
  tbValidator('json', createCategorySchema, (result, c) => {
    if (!result.success) {
      return c.json({ success: false, error: 'Validation failed: ' + [...result.errors].map(e => `${(e as any).path || (e as any).instancePath?.replace(/^\//, '') || 'field'}: ${e.message}`).join(', ') }, 400);
    }
  }),
  async (c) => {
    if (!c.env || !c.env.DB) {
      return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    }
    const body = c.req.valid('json');
    const db = createDb(c.env.DB);
    try {
      const newCat = await createCategory(db, body);
      return c.json({ success: true, data: newCat });
    } catch (err: any) {
      return c.json({ success: false, error: err.message }, 400);
    }
  }
);

