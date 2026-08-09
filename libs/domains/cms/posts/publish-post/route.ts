import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { publishPost } from './handler';
import { publishPostSchema } from './validator';

export type Bindings = { DB: D1Database };

export const publishPostRoute = new Hono<{ Bindings: Bindings }>();

publishPostRoute.post(
  '/posts/:id/publish',
  tbValidator('json', publishPostSchema, (result, c) => {
    if (!result.success) return c.json({ success: false, error: 'Validation failed' }, 400);
  }),
  async (c) => {
    if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    const postId = Number(c.req.param('id'));
    if (!Number.isSafeInteger(postId) || postId < 1) {
      return c.json({ success: false, error: "Identifiant d'actualité invalide" }, 400);
    }
    const db = createDb(c.env.DB);
    return c.json({
      success: true,
      data: await publishPost(db, { postId, published: c.req.valid('json').published })
    });
  }
);
