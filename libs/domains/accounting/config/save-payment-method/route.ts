import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { createPaymentMethod, updatePaymentMethod } from './handler';
import { createPaymentMethodSchema, updatePaymentMethodSchema } from './validator';

export type Bindings = { DB: D1Database };

export const savePaymentMethodRoute = new Hono<{ Bindings: Bindings }>();

const invalid = (result: { success: boolean }, c: any) => {
  if (!result.success) return c.json({ success: false, error: 'Données de moyen de paiement invalides' }, 400);
};

savePaymentMethodRoute.post('/payment-methods', tbValidator('json', createPaymentMethodSchema, invalid), async (c) => {
  if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  const created = await createPaymentMethod(createDb(c.env.DB), c.req.valid('json'));
  return c.json({ success: true, data: created }, 201);
});

savePaymentMethodRoute.put('/payment-methods/:id', tbValidator('json', updatePaymentMethodSchema, invalid), async (c) => {
  if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  const id = Number(c.req.param('id'));
  if (!Number.isSafeInteger(id) || id < 1) return c.json({ success: false, error: 'Identifiant invalide' }, 400);
  const updated = await updatePaymentMethod(createDb(c.env.DB), id, c.req.valid('json'));
  return c.json({ success: true, data: updated });
});
