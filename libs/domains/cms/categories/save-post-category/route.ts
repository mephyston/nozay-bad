import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { savePostCategory } from './handler';
import { savePostCategorySchema } from './validator';

export type Bindings = { DB: D1Database };

export const savePostCategoryRoute = new Hono<{ Bindings: Bindings }>();

savePostCategoryRoute.post(
  '/post-categories',
  tbValidator('json', savePostCategorySchema, (result, c) => {
    if (!result.success) return c.json({ success: false, error: 'Validation failed' }, 400);
  }),
  async (c) => {
    if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    const db = createDb(c.env.DB);
    return c.json({ success: true, data: await savePostCategory(db, c.req.valid('json')) });
  }
);
