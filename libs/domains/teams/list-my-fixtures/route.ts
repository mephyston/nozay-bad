import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { listMyFixtures } from './handler';

export type Bindings = { DB: D1Database };

export const listMyFixturesRoute = new Hono<{ Bindings: Bindings }>();

listMyFixturesRoute.get('/my-fixtures', async (c) => {
  if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);

  const seasonCode = c.req.query('seasonCode');
  const licence = c.req.query('licence');
  if (!seasonCode) return c.json({ success: false, error: 'Paramètre `seasonCode` requis.' }, 400);
  if (!licence) return c.json({ success: false, error: 'Paramètre `licence` requis.' }, 400);

  const limitParam = Number(c.req.query('limit'));
  const limit = Number.isSafeInteger(limitParam) && limitParam > 0 ? limitParam : undefined;

  return c.json({
    success: true,
    data: await listMyFixtures(createDb(c.env.DB), { seasonCode, licence, limit })
  });
});
