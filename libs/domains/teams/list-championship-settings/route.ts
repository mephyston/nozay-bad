import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { listChampionshipSettings } from './handler';

export type Bindings = { DB: D1Database };

export const listChampionshipSettingsRoute = new Hono<{ Bindings: Bindings }>();

listChampionshipSettingsRoute.get('/championship-settings', async (c) => {
  if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);

  const seasonCode = c.req.query('seasonCode');
  if (!seasonCode) return c.json({ success: false, error: 'Paramètre `seasonCode` requis.' }, 400);

  return c.json({
    success: true,
    data: await listChampionshipSettings(createDb(c.env.DB), seasonCode)
  });
});
