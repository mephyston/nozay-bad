import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { listChecks, listCheckDeposits } from './handler';

export type Bindings = {
  DB: D1Database;
};

export const listChecksRoute = new Hono<{ Bindings: Bindings }>();

listChecksRoute.get('/checks', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const season = c.req.query('season');
  if (!season) {
    return c.json({ success: false, error: 'Missing season query parameter' }, 400);
  }
  const status = c.req.query('status');
  const db = drizzle(c.env.DB);
  const data = await listChecks(db, season, status);
  return c.json({ success: true, data });
});

listChecksRoute.get('/check-deposits', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const season = c.req.query('season');
  if (!season) {
    return c.json({ success: false, error: 'Missing season query parameter' }, 400);
  }
  const db = drizzle(c.env.DB);
  const data = await listCheckDeposits(db, season);
  return c.json({ success: true, data });
});
