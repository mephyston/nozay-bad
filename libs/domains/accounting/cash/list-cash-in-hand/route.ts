import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { listCashInHand } from './handler';

export type Bindings = { DB: D1Database };

export const listCashInHandRoute = new Hono<{ Bindings: Bindings }>();

listCashInHandRoute.get('/cash-in-hand', async (c) => {
  if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  return c.json({ success: true, data: await listCashInHand(createDb(c.env.DB)) });
});
