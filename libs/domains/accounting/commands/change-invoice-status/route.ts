import { Hono } from 'hono';
import { createDb } from '@metacult/shared-db';
import { tbValidator } from '@hono/typebox-validator';
import { changeInvoiceStatus } from './handler';
import { changeInvoiceStatusSchema } from './validator';

export type Bindings = {
  DB: D1Database;
};

export const changeInvoiceStatusRoute = new Hono<{ Bindings: Bindings }>();

changeInvoiceStatusRoute.post(
  '/invoices/:id/status',
  async (c, next) => {
    const id = parseInt(c.req.param('id'));
    if (isNaN(id)) {
      return c.json({ success: false, error: 'Identifiant invalide' }, 400);
    }
    await next();
  },
  tbValidator('json', changeInvoiceStatusSchema, (result, c) => {
    if (!result.success) {
      const hasStatusError = result.errors.some(e => e.instancePath === '/status');
      if (hasStatusError) {
        return c.json({ success: false, error: 'Statut invalide' }, 400);
      }
      return c.json({ success: false, error: 'Validation failed: ' + [...result.errors].map(e => `${e.instancePath?.replace(/^\//, '') || 'field'}: ${e.message}`).join(', ') }, 400);
    }
  }),
  async (c) => {
    if (!c.env || !c.env.DB) {
      return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    }
    const id = parseInt(c.req.param('id'));
    const { status } = c.req.valid('json');
    const db = createDb(c.env.DB);
    try {
      await changeInvoiceStatus(db, id, status);
      return c.json({ success: true });
    } catch (err: any) {
      return c.json({ success: false, error: err.message }, err.status || 400);
    }
  }
);
