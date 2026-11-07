import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { refundCard } from './handler';
import { refundCardSchema } from './validator';
import { actorEmail, refuseInvalid, tokenSecret } from '../shared/validation';

export const refundCardRoute = new Hono<{ Bindings: { DB: D1Database; BUVETTE_TOKEN_SECRET?: string } }>();

refundCardRoute.post('/cards/refund', tbValidator('json', refundCardSchema, refuseInvalid), async (c) => {
  const data = await refundCard(createDb(c.env.DB), tokenSecret(c), { ...c.req.valid('json'), createdByEmail: actorEmail(c) });
  return c.json({ success: true, data });
});
