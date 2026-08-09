import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { updatePost } from './handler';
import { updatePostSchema } from './validator';

export type Bindings = { DB: D1Database };

export const updatePostRoute = new Hono<{ Bindings: Bindings }>();

updatePostRoute.put(
  '/posts/:id',
  tbValidator('json', updatePostSchema, (result, c) => {
    if (!result.success) {
      return c.json({ success: false, error: 'Validation failed: ' + [...result.errors].map(e => `${(e as any).path || 'field'}: ${e.message}`).join(', ') }, 400);
    }
  }),
  async (c) => {
    if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    const postId = Number(c.req.param('id'));
    if (!Number.isSafeInteger(postId) || postId < 1) {
      return c.json({ success: false, error: "Identifiant d'actualité invalide" }, 400);
    }
    const db = createDb(c.env.DB);
    return c.json({ success: true, data: await updatePost(db, { postId, ...c.req.valid('json') }) });
  }
);
