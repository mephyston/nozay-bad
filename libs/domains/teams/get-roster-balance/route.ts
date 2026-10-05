import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { CHAMPIONSHIPS, type Championship } from '../shared/championship';
import { getRosterBalance } from './handler';

export type Bindings = { DB: D1Database };

export const getRosterBalanceRoute = new Hono<{ Bindings: Bindings }>();

getRosterBalanceRoute.get('/roster-balance', async (c) => {
  if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);

  const seasonCode = c.req.query('seasonCode');
  const championship = c.req.query('championship') as Championship | undefined;
  if (!seasonCode) return c.json({ success: false, error: 'Paramètre `seasonCode` requis.' }, 400);
  if (!championship || !CHAMPIONSHIPS.includes(championship)) {
    return c.json({ success: false, error: 'Paramètre `championship` invalide.' }, 400);
  }

  return c.json({ success: true, data: await getRosterBalance(createDb(c.env.DB), { seasonCode, championship }) });
});
