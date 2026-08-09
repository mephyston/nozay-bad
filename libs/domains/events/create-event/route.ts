import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { createEvent } from './handler';
import { createEventSchema } from './validator';

export type Bindings = { DB: D1Database };

export const createEventRoute = new Hono<{ Bindings: Bindings }>();

createEventRoute.post(
  '/',
  tbValidator('json', createEventSchema, (result, c) => {
    if (!result.success) {
      return c.json({ success: false, error: 'Validation failed: ' + [...result.errors].map(e => `${(e as any).path || 'field'}: ${e.message}`).join(', ') }, 400);
    }
  }),
  async (c) => {
    if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    return c.json({ success: true, data: await createEvent(createDb(c.env.DB), c.req.valid('json')) });
  }
);
