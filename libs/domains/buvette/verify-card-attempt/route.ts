import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { abandonSale, retryAttempt, verifyAttempt } from './handler';
import { saleParamSchema, verifyAttemptSchema } from './validator';
import { createSumUpClient, type SumUpBindings } from '../shared/sumup';
import { actorEmail, refuseInvalid } from '../shared/validation';

export const cardAttemptsRoute = new Hono<{ Bindings: { DB: D1Database } & SumUpBindings }>();

const saleParam = tbValidator('param', saleParamSchema, refuseInvalid);

cardAttemptsRoute.post('/card-attempts/verify', tbValidator('json', verifyAttemptSchema, refuseInvalid), async (c) => {
  const data = await verifyAttempt(createDb(c.env.DB), createSumUpClient(c.env), c.req.valid('json').foreignTxId);
  return c.json({ success: true, data });
});

cardAttemptsRoute.post('/sales/:id/card-attempts', saleParam, async (c) => {
  const data = await retryAttempt(createDb(c.env.DB), createSumUpClient(c.env), Number(c.req.valid('param').id));
  return c.json({ success: true, data });
});

cardAttemptsRoute.post('/sales/:id/abandon', saleParam, async (c) => {
  const data = await abandonSale(createDb(c.env.DB), createSumUpClient(c.env), Number(c.req.valid('param').id), actorEmail(c));
  return c.json({ success: true, data });
});
