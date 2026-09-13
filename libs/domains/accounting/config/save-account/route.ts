import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { createAccount, updateAccount } from './handler';
import { createAccountSchema, updateAccountSchema } from './validator';

export type Bindings = { DB: D1Database };

export const saveAccountRoute = new Hono<{ Bindings: Bindings }>();

const invalid = (result: { success: boolean; errors?: Iterable<unknown> }, c: any) => {
  if (!result.success) return c.json({ success: false, error: 'Données de compte invalides' }, 400);
};

saveAccountRoute.post('/accounts', tbValidator('json', createAccountSchema, invalid), async (c) => {
  if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  const created = await createAccount(createDb(c.env.DB), c.req.valid('json'));
  return c.json({ success: true, data: created }, 201);
});

saveAccountRoute.put('/accounts/:id', tbValidator('json', updateAccountSchema, invalid), async (c) => {
  if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  const id = Number(c.req.param('id'));
  if (!Number.isSafeInteger(id) || id < 1) return c.json({ success: false, error: 'Identifiant invalide' }, 400);
  const updated = await updateAccount(createDb(c.env.DB), id, c.req.valid('json'));
  return c.json({ success: true, data: updated });
});
