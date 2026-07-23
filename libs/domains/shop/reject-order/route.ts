import { Hono } from 'hono';
import { createDb } from '@metacult/shared-db';
import { rejectOrder } from './handler';

export type Bindings = {
  DB: D1Database;
};

export const rejectOrderRoute = new Hono<{ Bindings: Bindings }>();

rejectOrderRoute.post('/orders/:id/reject', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) {
    return c.json({ success: false, error: 'Identifiant invalide' }, 400);
  }
  const db = createDb(c.env.DB);

  const updatedOrder = await rejectOrder(db, id);
  return c.json({ success: true, data: updatedOrder });
});
