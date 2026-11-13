import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { cancelCashHandover } from './handler';

export type Bindings = { DB: D1Database };

export const cancelCashHandoverRoute = new Hono<{ Bindings: Bindings }>();

cancelCashHandoverRoute.delete('/cash-handovers/:id', async (c) => {
  const id = Number(c.req.param('id'));
  if (!c.env?.DB || !Number.isSafeInteger(id) || id < 1) return c.json({ success: false, error: 'Identifiant invalide' }, 400);
  await cancelCashHandover(createDb(c.env.DB), id);
  return c.json({ success: true });
});
