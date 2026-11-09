import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { refundCardPayment } from './handler';
import { attemptParamSchema } from './validator';
import type { SumUpBindings } from '../shared/sumup';
import { createSumUpRefunds } from '../shared/sumup-refunds';
import { actorEmail, refuseInvalid } from '../shared/validation';

export const refundCardPaymentRoute = new Hono<{ Bindings: { DB: D1Database } & SumUpBindings }>();

refundCardPaymentRoute.post('/card-attempts/:id/refund', tbValidator('param', attemptParamSchema, refuseInvalid), async (c) => {
  const data = await refundCardPayment(createDb(c.env.DB), createSumUpRefunds(c.env), {
    attemptId: Number(c.req.valid('param').id),
    requestedByEmail: actorEmail(c)
  });
  return c.json({ success: true, data });
});
