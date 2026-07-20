import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { updateSeason } from './handler';

export type Bindings = {
  DB: D1Database;
};

export const updateSeasonRoute = new Hono<{ Bindings: Bindings }>();

updateSeasonRoute.put('/:id', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const id = c.req.param('id');
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  try {
    const data = await updateSeason(db, id, body);
    return c.json({ success: true, data });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 400);
  }
});
