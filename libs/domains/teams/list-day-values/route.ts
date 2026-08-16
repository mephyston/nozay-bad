import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { listDayValues } from './handler';
import { CHAMPIONSHIPS, type Championship } from '../shared/championship';

export type Bindings = { DB: D1Database };

export const listDayValuesRoute = new Hono<{ Bindings: Bindings }>();

listDayValuesRoute.get('/day-values', async (c) => {
  if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);

  const seasonCode = c.req.query('seasonCode');
  const championship = c.req.query('championship') as Championship | undefined;
  const dayNumber = Number(c.req.query('day'));

  if (!seasonCode) return c.json({ success: false, error: 'Paramètre `seasonCode` requis.' }, 400);
  if (!championship || !CHAMPIONSHIPS.includes(championship)) {
    return c.json({ success: false, error: 'Paramètre `championship` invalide.' }, 400);
  }
  if (!Number.isSafeInteger(dayNumber) || dayNumber < 1) {
    return c.json({ success: false, error: 'Paramètre `day` invalide.' }, 400);
  }

  return c.json({
    success: true,
    data: await listDayValues(createDb(c.env.DB), { seasonCode, championship, dayNumber })
  });
});
