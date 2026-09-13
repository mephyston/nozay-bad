import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { createOrder } from './handler';
import { createOrderSchema } from './validator';

export type Bindings = {
  DB: D1Database;
};

export const createOrderRoute = new Hono<{ Bindings: Bindings }>();

createOrderRoute.post('/orders', tbValidator('json', createOrderSchema, (result, c) => {
  if (!result.success) {
    return c.json({ success: false, error: 'Validation failed: ' + [...result.errors].map(e => `${(e as any).path || (e as any).instancePath?.replace(/^\//, '') || 'field'}: ${e.message}`).join(', ') }, 400);
  }
}), async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const body = c.req.valid('json');
  const db = createDb(c.env.DB);

  // L'appelant de service de la boutique des adhérents : les moyens réservés à l'administration lui sont refusés.
  const caller = c.req.header('x-caller');
  const order = await createOrder(db, body, { storefront: caller === 'storefront' });
  return c.json({ success: true, data: order });
});
