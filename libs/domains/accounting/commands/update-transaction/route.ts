import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { updateTransaction } from './handler';

export type Bindings = {
  DB: D1Database;
};

export const updateTransactionRoute = new Hono<{ Bindings: Bindings }>();

updateTransactionRoute.put('/transactions/:id', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const id = parseInt(c.req.param('id'));
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  const data = await updateTransaction(db, id, body);
  return c.json({ success: true, data });
});
