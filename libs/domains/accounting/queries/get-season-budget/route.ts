import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { getSeasonBudget } from './handler';

export type Bindings = {
  DB: D1Database;
};

export const getSeasonBudgetRoute = new Hono<{ Bindings: Bindings }>();

getSeasonBudgetRoute.get('/:seasonId/budget', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const seasonId = c.req.param('seasonId');
  const db = createDb(c.env.DB);
  try {
    const data = await getSeasonBudget(db, seasonId);
    return c.json({ success: true, data });
  } catch (err: unknown) {
    return c.json({ success: false, error: err.message }, 500);
  }
});
