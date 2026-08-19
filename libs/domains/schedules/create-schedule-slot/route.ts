import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { createScheduleSlot } from './handler';
import { createScheduleSlotSchema } from './validator';

export type Bindings = { DB: D1Database };

export const createScheduleSlotRoute = new Hono<{ Bindings: Bindings }>();

createScheduleSlotRoute.post(
  '/',
  tbValidator('json', createScheduleSlotSchema, (result, c) => {
    if (!result.success) {
      return c.json({ success: false, error: 'Validation failed: ' + [...result.errors].map(e => `${(e as any).path || 'field'}: ${e.message}`).join(', ') }, 400);
    }
  }),
  async (c) => {
    if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    const db = createDb(c.env.DB);
    return c.json({ success: true, data: await createScheduleSlot(db, c.req.valid('json')) });
  }
);
