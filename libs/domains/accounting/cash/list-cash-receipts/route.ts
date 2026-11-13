import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { listHeldCashReceipts } from './handler';

export type Bindings = { DB: D1Database };

export const listCashReceiptsRoute = new Hono<{ Bindings: Bindings }>();

listCashReceiptsRoute.get('/cash-receipts', async (c) => {
  if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  return c.json({ success: true, data: await listHeldCashReceipts(createDb(c.env.DB), c.req.header('x-user-email') ?? '') });
});
