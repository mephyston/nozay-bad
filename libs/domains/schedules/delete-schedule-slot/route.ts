import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { deleteScheduleSlot } from './handler';

export type Bindings = { DB: D1Database };

export const deleteScheduleSlotRoute = new Hono<{ Bindings: Bindings }>();

deleteScheduleSlotRoute.delete('/:id', async (c) => {
  if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  const slotId = Number(c.req.param('id'));
  if (!Number.isSafeInteger(slotId) || slotId < 1) {
    return c.json({ success: false, error: 'Identifiant de créneau invalide' }, 400);
  }
  const db = createDb(c.env.DB);
  return c.json({ success: true, data: await deleteScheduleSlot(db, { slotId }) });
});
