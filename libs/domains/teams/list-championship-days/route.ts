import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { listChampionshipDays } from './handler';
import { CHAMPIONSHIPS, type Championship } from '../shared/championship';

export type Bindings = { DB: D1Database };

export const listChampionshipDaysRoute = new Hono<{ Bindings: Bindings }>();

listChampionshipDaysRoute.get('/days', async (c) => {
  if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);

  const seasonCode = c.req.query('seasonCode');
  const championship = c.req.query('championship') as Championship | undefined;

  if (!seasonCode) return c.json({ success: false, error: 'Paramètre `seasonCode` requis.' }, 400);
  if (!championship || !CHAMPIONSHIPS.includes(championship)) {
    return c.json({ success: false, error: 'Paramètre `championship` invalide.' }, 400);
  }

  return c.json({
    success: true,
    data: await listChampionshipDays(createDb(c.env.DB), seasonCode, championship)
  });
});
