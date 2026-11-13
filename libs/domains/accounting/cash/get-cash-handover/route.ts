import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { getCashHandover } from './handler';

export type Bindings = { DB: D1Database };

export const getCashHandoverRoute = new Hono<{ Bindings: Bindings }>();

getCashHandoverRoute.get('/cash-handovers/:id', async (c) => {
  const id = Number(c.req.param('id'));
  if (!c.env?.DB || !Number.isSafeInteger(id) || id < 1) return c.json({ success: false, error: 'Identifiant invalide' }, 400);
  return c.json({ success: true, data: await getCashHandover(createDb(c.env.DB), id) });
});
