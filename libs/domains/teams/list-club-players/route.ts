import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { listClubPlayers } from './handler';

export type Bindings = { DB: D1Database };

export const listClubPlayersRoute = new Hono<{ Bindings: Bindings }>();

listClubPlayersRoute.get('/players', async (c) => {
  if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);

  const seasonCode = c.req.query('seasonCode');
  if (!seasonCode) return c.json({ success: false, error: 'Paramètre `seasonCode` requis.' }, 400);

  return c.json({
    success: true,
    data: await listClubPlayers(createDb(c.env.DB), { seasonCode })
  });
});
