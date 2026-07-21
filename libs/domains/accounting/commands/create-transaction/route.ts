import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { createTransaction } from './handler';

export type Bindings = {
  DB: D1Database;
};

export const createTransactionRoute = new Hono<{ Bindings: Bindings }>();

createTransactionRoute.post('/transactions', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  const data = await createTransaction(db, body);
  return c.json({ success: true, data });
});
