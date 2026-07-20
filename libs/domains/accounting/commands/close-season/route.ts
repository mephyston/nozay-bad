import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { closeSeason } from './handler';

export type Bindings = {
  DB: D1Database;
};

export const closeSeasonRoute = new Hono<{ Bindings: Bindings }>();

closeSeasonRoute.post('/:id/close', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);
  try {
    const data = await closeSeason(db, id);
    return c.json({ success: true, data });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 400);
  }
});
