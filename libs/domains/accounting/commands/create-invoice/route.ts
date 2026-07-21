import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { createInvoice } from './handler';

export type Bindings = {
  DB: D1Database;
};

export const createInvoiceRoute = new Hono<{ Bindings: Bindings }>();

createInvoiceRoute.post('/invoices', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  const data = await createInvoice(db, body);
  return c.json({ success: true, data });
});
