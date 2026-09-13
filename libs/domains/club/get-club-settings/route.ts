import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { getClubSettingsView } from './handler';

export type Bindings = { DB: D1Database };

export const getClubSettingsRoute = new Hono<{ Bindings: Bindings }>();

getClubSettingsRoute.get('/settings', async (c) => {
  if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  const db = createDb(c.env.DB);
  return c.json({ success: true, data: await getClubSettingsView(db) });
});
