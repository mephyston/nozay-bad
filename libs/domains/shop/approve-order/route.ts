import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { approveOrder } from './handler';

export type Bindings = {
  DB: D1Database;
};

export const approveOrderRoute = new Hono<{ Bindings: Bindings }>();

approveOrderRoute.post('/orders/:id/approve', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) {
    return c.json({ success: false, error: 'Identifiant invalide' }, 400);
  }
  const db = drizzle(c.env.DB);

  const updatedOrder = await approveOrder(db, id);
  return c.json({ success: true, data: updatedOrder });
});
