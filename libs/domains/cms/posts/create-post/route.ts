import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { createPost } from './handler';
import { createPostSchema } from './validator';

export type Bindings = { DB: D1Database };

export const createPostRoute = new Hono<{ Bindings: Bindings }>();

createPostRoute.post(
  '/posts',
  tbValidator('json', createPostSchema, (result, c) => {
    if (!result.success) {
      return c.json({ success: false, error: 'Validation failed: ' + [...result.errors].map(e => `${(e as any).path || 'field'}: ${e.message}`).join(', ') }, 400);
    }
  }),
  async (c) => {
    if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    const body = c.req.valid('json');
    const db = createDb(c.env.DB);
    const email = c.req.header('x-user-email') || '';
    return c.json({ success: true, data: await createPost(db, body, { email, name: email }) });
  }
);
