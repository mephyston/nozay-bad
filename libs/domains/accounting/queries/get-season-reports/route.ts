import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { getSeasonReports } from './handler';

export type Bindings = {
  DB: D1Database;
};

export const getSeasonReportsRoute = new Hono<{ Bindings: Bindings }>();

getSeasonReportsRoute.get('/:seasonId/reports', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const seasonId = c.req.param('seasonId');
  const db = drizzle(c.env.DB);
  const data = await getSeasonReports(db, seasonId);
  return c.json({ success: true, data });
});
