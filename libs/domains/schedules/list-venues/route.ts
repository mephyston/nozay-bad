import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { listVenues } from './handler';

export type Bindings = { DB: D1Database };

export const listVenuesRoute = new Hono<{ Bindings: Bindings }>();

listVenuesRoute.get('/venues', async (c) => {
  if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  return c.json({ success: true, data: await listVenues(createDb(c.env.DB)) });
});
