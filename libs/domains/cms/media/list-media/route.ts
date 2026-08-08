import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { listMedia } from './handler';
import { listMediaQuerySchema } from './validator';

export type Bindings = { DB: D1Database };

export const listMediaRoute = new Hono<{ Bindings: Bindings }>();

listMediaRoute.get(
  '/media',
  tbValidator('query', listMediaQuerySchema, (result, c) => {
    if (!result.success) {
      return c.json({ success: false, error: 'Validation failed: ' + [...result.errors].map(e => `${(e as any).path || 'field'}: ${e.message}`).join(', ') }, 400);
    }
  }),
  async (c) => {
    if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    const { limit, offset } = c.req.valid('query');
    const db = createDb(c.env.DB);
    return c.json({
      success: true,
      data: await listMedia(db, { limit: limit ? Number(limit) : undefined, offset: offset ? Number(offset) : undefined })
    });
  }
);
