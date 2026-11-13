import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { cancelCashReceipt } from './handler';

export type Bindings = { DB: D1Database };

export const cancelCashReceiptRoute = new Hono<{ Bindings: Bindings }>();

cancelCashReceiptRoute.delete('/cash-receipts/:id', async (c) => {
  const id = Number(c.req.param('id'));
  if (!c.env?.DB || !Number.isSafeInteger(id) || id < 1) return c.json({ success: false, error: 'Identifiant invalide' }, 400);
  await cancelCashReceipt(createDb(c.env.DB), c.req.header('x-user-email') ?? '', id);
  return c.json({ success: true });
});
