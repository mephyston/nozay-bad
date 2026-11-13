import { Hono } from 'hono';
import { createDb } from '@nba/db';
import type { CashMailDeps } from '../../shared/cash';
import { sendCashReceiptCode } from './handler';

export type Bindings = { DB: D1Database };

export const createSendCashReceiptCodeRoute = (deps: CashMailDeps) => {
  const route = new Hono<{ Bindings: Bindings }>();
  route.post('/cash-receipts/:id/code', async (c) => {
    const id = Number(c.req.param('id'));
    if (!c.env?.DB || !Number.isSafeInteger(id) || id < 1) return c.json({ success: false, error: 'Identifiant invalide' }, 400);
    const data = await sendCashReceiptCode(createDb(c.env.DB), deps.mailerFor(c.env), c.req.header('x-user-email') ?? '', id);
    return c.json({ success: true, data });
  });
  return route;
};
