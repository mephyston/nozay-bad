import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { tbValidator } from '@hono/typebox-validator';
import { updateInvoice } from './handler';
import { updateInvoiceSchema } from './validator';

export type Bindings = {
  DB: D1Database;
};

export const updateInvoiceRoute = new Hono<{ Bindings: Bindings }>();

updateInvoiceRoute.put(
  '/invoices/:id',
  async (c, next) => {
    const id = parseInt(c.req.param('id'));
    if (isNaN(id)) {
      return c.json({ success: false, error: 'Identifiant invalide' }, 400);
    }
    await next();
  },
  tbValidator('json', updateInvoiceSchema, (result, c) => {
    if (!result.success) {
      return c.json({ success: false, error: 'Validation failed: ' + [...result.errors].map(e => `${e.instancePath?.replace(/^\//, '') || 'field'}: ${e.message}`).join(', ') }, 400);
    }
  }),
  async (c) => {
    if (!c.env || !c.env.DB) {
      return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    }
    const id = parseInt(c.req.param('id'));
    const body = c.req.valid('json');
    const db = drizzle(c.env.DB);
    try {
      await updateInvoice(db, id, body);
      return c.json({ success: true });
    } catch (err: any) {
      return c.json({ success: false, error: err.message }, err.status || 400);
    }
  }
);
