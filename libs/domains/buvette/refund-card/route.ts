import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { refundCard } from './handler';
import { refundCardSchema } from './validator';
import { actorEmail, refuseInvalid, tokenSecret } from '../shared/validation';
import type { SumUpBindings } from '../shared/sumup';
import { createSumUpRefunds } from '../shared/sumup-refunds';

export const refundCardRoute = new Hono<{ Bindings: { DB: D1Database; BUVETTE_TOKEN_SECRET?: string } & SumUpBindings }>();

refundCardRoute.post('/cards/refund', tbValidator('json', refundCardSchema, refuseInvalid), async (c) => {
  // Sans clé SumUp, tout le solde sort en espèces.
  const sumup = c.env.SUMUP_API_KEY ? createSumUpRefunds(c.env) : undefined;
  const data = await refundCard(createDb(c.env.DB), tokenSecret(c), { ...c.req.valid('json'), createdByEmail: actorEmail(c) }, sumup);
  return c.json({ success: true, data });
});
