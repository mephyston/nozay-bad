import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { renewHandoverToken, renewReceiptToken } from './handler';

export type Bindings = { DB: D1Database };

export const renewCashTokenRoute = new Hono<{ Bindings: Bindings }>();

const idOf = (raw: string) => {
  const id = Number(raw);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
};

renewCashTokenRoute.post('/cash-receipts/:id/token', async (c) => {
  const id = idOf(c.req.param('id'));
  if (!c.env?.DB || id === null) return c.json({ success: false, error: 'Identifiant invalide' }, 400);
  return c.json({ success: true, data: await renewReceiptToken(createDb(c.env.DB), c.req.header('x-user-email') ?? '', id) });
});

renewCashTokenRoute.post('/cash-handovers/:id/token', async (c) => {
  const id = idOf(c.req.param('id'));
  if (!c.env?.DB || id === null) return c.json({ success: false, error: 'Identifiant invalide' }, 400);
  return c.json({ success: true, data: await renewHandoverToken(createDb(c.env.DB), id) });
});
