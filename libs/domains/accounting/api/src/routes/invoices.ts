import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { createInvoice } from '../../../create-invoice/handler';
import { updateInvoice } from '../../../update-invoice/handler';
import { deleteInvoice } from '../../../delete-invoice/handler';
import { changeInvoiceStatus } from '../../../change-invoice-status/handler';
import { listInvoices } from '../../../list-invoices/handler';
import { getInvoice } from '../../../get-invoice/handler';
import type { Bindings } from '../routes';

export const invoicesRouter = new Hono<{ Bindings: Bindings }>();

invoicesRouter.get('/', async (c) => {
  const season = c.req.query('season');
  if (!season) return c.json({ success: false, error: 'Saison manquante' }, 400);
  const db = drizzle(c.env.DB);
  const data = await listInvoices(db, season);
  return c.json({ success: true, data });
});

invoicesRouter.get('/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) {
    return c.json({ success: false, error: 'Identifiant invalide' }, 400);
  }
  const db = drizzle(c.env.DB);
  const data = await getInvoice(db, id);
  return c.json({ success: true, data });
});

invoicesRouter.post('/', async (c) => {
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  const data = await createInvoice(db, body);
  return c.json({ success: true, data });
});

invoicesRouter.put('/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) {
    return c.json({ success: false, error: 'Identifiant invalide' }, 400);
  }
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  await updateInvoice(db, id, body);
  return c.json({ success: true });
});

invoicesRouter.delete('/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) {
    return c.json({ success: false, error: 'Identifiant invalide' }, 400);
  }
  const db = drizzle(c.env.DB);
  await deleteInvoice(db, id);
  return c.json({ success: true });
});

invoicesRouter.post('/:id/status', async (c) => {
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) {
    return c.json({ success: false, error: 'Identifiant invalide' }, 400);
  }
  const { status } = await c.req.json();
  const db = drizzle(c.env.DB);
  await changeInvoiceStatus(db, id, status);
  return c.json({ success: true });
});
