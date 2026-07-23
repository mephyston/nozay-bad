import { Hono } from 'hono';
import { createDb } from '@metacult/shared-db';
import { getInvoice } from './handler';

export type Bindings = {
  DB: D1Database;
};

export const getInvoiceRoute = new Hono<{ Bindings: Bindings }>();

getInvoiceRoute.get('/invoices/:id', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) {
    return c.json({ success: false, error: 'Identifiant invalide' }, 400);
  }
  const db = createDb(c.env.DB);
  const data = await getInvoice(db, id);
  return c.json({ success: true, data });
});
