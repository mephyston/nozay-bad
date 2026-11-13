import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { getCashReceipt } from './handler';

export type Bindings = { DB: D1Database };

export const getCashReceiptRoute = new Hono<{ Bindings: Bindings }>();

getCashReceiptRoute.get('/cash-receipts/:id', async (c) => {
  if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  const id = Number(c.req.param('id'));
  if (!Number.isSafeInteger(id) || id < 1) return c.json({ success: false, error: 'Identifiant invalide' }, 400);
  return c.json({ success: true, data: await getCashReceipt(createDb(c.env.DB), c.req.header('x-user-email') ?? '', id) });
});
