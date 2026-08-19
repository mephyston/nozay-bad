import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { getContentVersionHandler } from './handler';

export type Bindings = {
  DB: D1Database;
};

export const getContentVersionRoute = new Hono<{ Bindings: Bindings }>();

getContentVersionRoute.get('/content-version', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const db = createDb(c.env.DB);
  return c.json({ success: true, data: await getContentVersionHandler(db) });
});
