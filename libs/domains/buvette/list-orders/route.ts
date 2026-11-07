import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { getPendingOrder, listPendingOrders } from './handler';
import { listOrdersQuerySchema, orderIdParamSchema } from './validator';
import { refuseInvalid } from '../shared/validation';

export const listOrdersRoute = new Hono<{ Bindings: { DB: D1Database } }>();

listOrdersRoute.get('/orders', tbValidator('query', listOrdersQuerySchema, refuseInvalid), async (c) => {
  return c.json({ success: true, data: await listPendingOrders(createDb(c.env.DB), c.req.valid('query').search) });
});

listOrdersRoute.get('/orders/:id', tbValidator('param', orderIdParamSchema, refuseInvalid), async (c) => {
  return c.json({ success: true, data: await getPendingOrder(createDb(c.env.DB), Number(c.req.valid('param').id)) });
});
