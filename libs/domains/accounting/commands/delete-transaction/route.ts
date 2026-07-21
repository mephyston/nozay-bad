import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { deleteTransaction } from './handler';

export type Bindings = {
  DB: D1Database;
};

export const deleteTransactionRoute = new Hono<{ Bindings: Bindings }>();

deleteTransactionRoute.delete('/transactions/:id', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) {
    return c.json({ success: false, error: 'Invalid ID' }, 400);
  }
  const db = drizzle(c.env.DB);
  await deleteTransaction(db, id);
  return c.json({ success: true });
});
