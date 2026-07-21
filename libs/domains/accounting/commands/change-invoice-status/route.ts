import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { changeInvoiceStatus } from './handler';

export type Bindings = {
  DB: D1Database;
};

export const changeInvoiceStatusRoute = new Hono<{ Bindings: Bindings }>();

changeInvoiceStatusRoute.post('/invoices/:id/status', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) {
    return c.json({ success: false, error: 'Identifiant invalide' }, 400);
  }
  const { status } = await c.req.json();
  const db = drizzle(c.env.DB);
  await changeInvoiceStatus(db, id, status);
  return c.json({ success: true });
});
