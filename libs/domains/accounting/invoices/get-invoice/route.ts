import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { getInvoice } from './handler';
import { getInvoiceParamSchema } from './validator';

export type Bindings = {
  DB: D1Database;
};

export const getInvoiceRoute = new Hono<{ Bindings: Bindings }>();

getInvoiceRoute.get(
  '/invoices/:id',
  tbValidator('param', getInvoiceParamSchema, (result, c) => {
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
    const data = await getInvoice(db, id);
    return c.json({ success: true, data });
  }
);
