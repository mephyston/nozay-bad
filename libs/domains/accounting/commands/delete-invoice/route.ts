import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { deleteInvoice } from './handler';
import { deleteInvoiceParamSchema } from './validator';

export type Bindings = {
  DB: D1Database;
};

export const deleteInvoiceRoute = new Hono<{ Bindings: Bindings }>();

deleteInvoiceRoute.delete(
  '/invoices/:id',
  tbValidator('param', deleteInvoiceParamSchema, (result, c) => {
    if (!result.success) {
      return c.json({ success: false, error: 'Identifiant invalide' }, 400);
    }
  }),
  async (c) => {
    if (!c.env || !c.env.DB) {
      return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    }
    const { id: idStr } = c.req.valid('param');
    const id = parseInt(idStr, 10);
    const db = createDb(c.env.DB);
    await deleteInvoice(db, id);
    return c.json({ success: true });
  }
);
