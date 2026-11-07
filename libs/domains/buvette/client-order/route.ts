import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { cancelOrder, createOrder, getCatalog, getCurrentOrder } from './handler';
import { createOrderSchema, orderDeviceSchema, orderParamSchema } from './validator';
import { refuseInvalid } from '../shared/validation';

export const clientOrderRoute = new Hono<{ Bindings: { DB: D1Database } }>();

const param = tbValidator('param', orderParamSchema, refuseInvalid);
const device = tbValidator('json', orderDeviceSchema, refuseInvalid);

clientOrderRoute.get('/catalog', async (c) => {
  return c.json({ success: true, data: await getCatalog(createDb(c.env.DB)) });
});

clientOrderRoute.post('/cards/:id/order', param, tbValidator('json', createOrderSchema, refuseInvalid), async (c) => {
  const { deviceId, lines } = c.req.valid('json');
  return c.json({ success: true, data: await createOrder(createDb(c.env.DB), Number(c.req.valid('param').id), deviceId, lines) });
});

clientOrderRoute.post('/cards/:id/order/current', param, device, async (c) => {
  const data = await getCurrentOrder(createDb(c.env.DB), Number(c.req.valid('param').id), c.req.valid('json').deviceId);
  return c.json({ success: true, data });
});

clientOrderRoute.post('/cards/:id/order/cancel', param, device, async (c) => {
  await cancelOrder(createDb(c.env.DB), Number(c.req.valid('param').id), c.req.valid('json').deviceId);
  return c.json({ success: true, data: null });
});
