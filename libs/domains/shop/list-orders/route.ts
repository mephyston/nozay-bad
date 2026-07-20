import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { listOrders } from './handler';

export type Bindings = {
  DB: D1Database;
};

export const listOrdersRoute = new Hono<{ Bindings: Bindings }>();

listOrdersRoute.get('/orders', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const season = c.req.query('season');
  const status = c.req.query('status');
  const db = drizzle(c.env.DB);

  const mappedOrders = await listOrders(db, { season, status });
  return c.json({ success: true, data: mappedOrders });
});
