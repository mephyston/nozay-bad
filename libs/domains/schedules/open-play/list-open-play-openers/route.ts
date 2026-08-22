import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { listOpenPlayOpeners } from './handler';

export type Bindings = { DB: D1Database };

export const listOpenPlayOpenersRoute = new Hono<{ Bindings: Bindings }>();

listOpenPlayOpenersRoute.get('/open-play/openers', async (c) => {
  if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);

  const seasonCode = c.req.query('season');
  if (!seasonCode) {
    return c.json({ success: false, error: 'Saison manquante' }, 400);
  }

  return c.json({
    success: true,
    data: await listOpenPlayOpeners(createDb(c.env.DB), { seasonCode })
  });
});
