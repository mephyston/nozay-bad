import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { updateInvoice } from './handler';

export type Bindings = {
  DB: D1Database;
};

export const updateInvoiceRoute = new Hono<{ Bindings: Bindings }>();

updateInvoiceRoute.put('/invoices/:id', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) {
    return c.json({ success: false, error: 'Identifiant invalide' }, 400);
  }
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  await updateInvoice(db, id, body);
  return c.json({ success: true });
});
