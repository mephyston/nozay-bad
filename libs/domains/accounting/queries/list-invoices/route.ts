import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { tbValidator } from '@hono/typebox-validator';
import { listInvoices } from './handler';
import { listInvoicesQuerySchema } from './validator';

export type Bindings = {
  DB: D1Database;
};

export const listInvoicesRoute = new Hono<{ Bindings: Bindings }>();

listInvoicesRoute.get(
  '/invoices',
  tbValidator('query', listInvoicesQuerySchema, (result, c) => {
    if (!result.success) {
      return c.json({ success: false, error: 'Validation failed: ' + [...result.errors].map(e => `${e.instancePath?.replace(/^\//, '') || 'field'}: ${e.message}`).join(', ') }, 400);
    }
  }),
  async (c) => {
    if (!c.env || !c.env.DB) {
      return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    }
    const { season } = c.req.valid('query');
    const db = drizzle(c.env.DB);
    const data = await listInvoices(db, season);
    return c.json({ success: true, data });
  }
);
