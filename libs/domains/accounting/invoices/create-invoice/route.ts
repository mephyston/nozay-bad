import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { createInvoice } from './handler';
import { createInvoiceSchema } from './validator';

export type Bindings = {
  DB: D1Database;
};

export const createInvoiceRoute = new Hono<{ Bindings: Bindings }>();

createInvoiceRoute.post(
  '/invoices',
  tbValidator('json', createInvoiceSchema, (result, c) => {
    if (!result.success) {
      return c.json({ success: false, error: 'Validation failed: ' + [...result.errors].map(e => `${(e as any).path || (e as any).instancePath?.replace(/^\//, '') || 'field'}: ${e.message}`).join(', ') }, 400);
    }
  }),
  async (c) => {
    if (!c.env || !c.env.DB) {
      return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    }
    const body = c.req.valid('json');
    const db = createDb(c.env.DB);
    try {
      const data = await createInvoice(db, body);
      return c.json({ success: true, data });
    } catch (err: any) {
      return c.json({ success: false, error: err.message }, 400);
    }
  }
);
