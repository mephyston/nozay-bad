import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { listSessionSales } from './handler';

export const listSessionSalesRoute = new Hono<{ Bindings: { DB: D1Database } }>();

listSessionSalesRoute.get('/sessions/current/sales', async (c) => {
  return c.json({ success: true, data: await listSessionSales(createDb(c.env.DB)) });
});
