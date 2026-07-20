import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { updateSeasonBudget } from './handler';

export type Bindings = {
  DB: D1Database;
};

export const updateSeasonBudgetRoute = new Hono<{ Bindings: Bindings }>();

updateSeasonBudgetRoute.post('/:seasonId/budget', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const seasonId = c.req.param('seasonId');
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  try {
    const data = await updateSeasonBudget(db, seasonId, body);
    return c.json({ success: true, data });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 400);
  }
});
