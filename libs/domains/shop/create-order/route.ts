import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { tbValidator } from '@hono/typebox-validator';
import { createOrder } from './handler';
import { createOrderSchema } from './validator';

export type Bindings = {
  DB: D1Database;
};

export const createOrderRoute = new Hono<{ Bindings: Bindings }>();

createOrderRoute.post('/orders', tbValidator('json', createOrderSchema, (result, c) => {
  if (!result.success) {
    return c.json({ success: false, error: 'Validation failed: ' + [...result.errors].map(e => `${e.instancePath?.replace(/^\//, '') || 'field'}: ${e.message}`).join(', ') }, 400);
  }
}), async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const body = c.req.valid('json');
  const db = drizzle(c.env.DB);

  const order = await createOrder(db, body);
  return c.json({ success: true, data: order });
});
