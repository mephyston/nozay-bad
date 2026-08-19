import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { updateScheduleSlot } from './handler';
import { updateScheduleSlotSchema } from './validator';

export type Bindings = { DB: D1Database };

export const updateScheduleSlotRoute = new Hono<{ Bindings: Bindings }>();

updateScheduleSlotRoute.put(
  '/:id',
  tbValidator('json', updateScheduleSlotSchema, (result, c) => {
    if (!result.success) return c.json({ success: false, error: 'Validation failed' }, 400);
  }),
  async (c) => {
    if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    const slotId = Number(c.req.param('id'));
    if (!Number.isSafeInteger(slotId) || slotId < 1) {
      return c.json({ success: false, error: 'Identifiant de créneau invalide' }, 400);
    }
    const db = createDb(c.env.DB);
    return c.json({ success: true, data: await updateScheduleSlot(db, { slotId, ...c.req.valid('json') }) });
  }
);
