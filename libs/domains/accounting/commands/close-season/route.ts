import { Hono } from 'hono';
import { createDb } from '@nba/db';
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
  const db = createDb(c.env.DB);
  try {
    const data = await closeSeason(db, id);
    return c.json({ success: true, data });
  } catch (err: unknown) {
    return c.json({ success: false, error: err.message }, 400);
  }
});
