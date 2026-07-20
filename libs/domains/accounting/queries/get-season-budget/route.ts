import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
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
  const db = drizzle(c.env.DB);
  try {
    const data = await getSeasonBudget(db, seasonId);
    return c.json({ success: true, data });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});
