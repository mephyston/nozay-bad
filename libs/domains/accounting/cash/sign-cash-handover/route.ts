import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { confirmCashHandover, signCashHandover } from './handler';
import { confirmHandoverSchema, handoverSignatureSchema } from './validator';

export type Bindings = { DB: D1Database };

export const signCashHandoverRoute = new Hono<{ Bindings: Bindings }>();

const invalid = (result: { success: boolean }, c: any) => {
  if (!result.success) return c.json({ success: false, error: 'Signature invalide' }, 400);
};

signCashHandoverRoute.post('/cash-handovers/confirm', tbValidator('json', confirmHandoverSchema, invalid), async (c) => {
  if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  const data = await confirmCashHandover(createDb(c.env.DB), c.req.header('x-user-email') ?? '', c.req.valid('json').qr);
  return c.json({ success: true, data });
});

signCashHandoverRoute.post('/cash-handovers/:id/signature', tbValidator('json', handoverSignatureSchema, invalid), async (c) => {
  const id = Number(c.req.param('id'));
  if (!c.env?.DB || !Number.isSafeInteger(id) || id < 1) return c.json({ success: false, error: 'Identifiant invalide' }, 400);
  return c.json({ success: true, data: await signCashHandover(createDb(c.env.DB), id, c.req.valid('json').signature) });
});
