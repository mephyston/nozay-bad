import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { cancelSale } from './handler';
import { cancelSaleParamSchema } from './validator';
import { actorEmail, refuseInvalid } from '../shared/validation';

export const cancelSaleRoute = new Hono<{ Bindings: { DB: D1Database } }>();

cancelSaleRoute.post('/sales/:id/cancel', tbValidator('param', cancelSaleParamSchema, refuseInvalid), async (c) => {
  const data = await cancelSale(createDb(c.env.DB), {
    saleId: Number(c.req.valid('param').id),
    cancelledByEmail: actorEmail(c)
  });
  return c.json({ success: true, data });
});
