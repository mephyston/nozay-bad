import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import type { CashMailDeps } from '../../shared/cash';
import { signWithCode, signWithSignature } from './handler';
import { signatureSchema, verifyCodeSchema } from './validator';

export type Bindings = { DB: D1Database };

const invalid = (result: { success: boolean }, c: any) => {
  if (!result.success) return c.json({ success: false, error: 'Signature invalide' }, 400);
};

export const createSignCashReceiptRoute = (deps: CashMailDeps) => {
  const route = new Hono<{ Bindings: Bindings }>();
  const idOf = (raw: string) => { const id = Number(raw); return Number.isSafeInteger(id) && id > 0 ? id : null; };

  route.post('/cash-receipts/:id/code/verify', tbValidator('json', verifyCodeSchema, invalid), async (c) => {
    const id = idOf(c.req.param('id'));
    if (!c.env?.DB || id === null) return c.json({ success: false, error: 'Identifiant invalide' }, 400);
    const data = await signWithCode(createDb(c.env.DB), deps.mailerFor(c.env), c.req.header('x-user-email') ?? '', id, c.req.valid('json').code);
    return c.json({ success: true, data });
  });

  route.post('/cash-receipts/:id/signature', tbValidator('json', signatureSchema, invalid), async (c) => {
    const id = idOf(c.req.param('id'));
    if (!c.env?.DB || id === null) return c.json({ success: false, error: 'Identifiant invalide' }, 400);
    const data = await signWithSignature(createDb(c.env.DB), deps.mailerFor(c.env), c.req.header('x-user-email') ?? '', id, c.req.valid('json').signature);
    return c.json({ success: true, data });
  });
  return route;
};
