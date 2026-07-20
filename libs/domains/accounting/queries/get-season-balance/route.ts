import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { getSeasonBalance } from './handler';

export type Bindings = {
  DB: D1Database;
};

export const getSeasonBalanceRoute = new Hono<{ Bindings: Bindings }>();

getSeasonBalanceRoute.get('/:seasonId/balance', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const seasonId = c.req.param('seasonId');
  const db = drizzle(c.env.DB);
  const data = await getSeasonBalance(db, seasonId);
  return c.json({ success: true, data });
});
