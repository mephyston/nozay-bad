import { Hono } from 'hono';
import { createDb } from '@metacult/shared-db';
import { getSeasonBalances } from './handler';

export type Bindings = {
  DB: D1Database;
};

export const getSeasonBalancesRoute = new Hono<{ Bindings: Bindings }>();

getSeasonBalancesRoute.get('/:seasonId/balances', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const seasonId = c.req.param('seasonId');
  const db = createDb(c.env.DB);
  const data = await getSeasonBalances(db, seasonId);
  return c.json({ success: true, data });
});
