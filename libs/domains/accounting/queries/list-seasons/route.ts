import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { listSeasons } from './handler';

export type Bindings = {
  DB: D1Database;
};

export const listSeasonsRoute = new Hono<{ Bindings: Bindings }>();

listSeasonsRoute.get('/', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const db = createDb(c.env.DB);
  const data = await listSeasons(db);
  return c.json({ success: true, data });
});
