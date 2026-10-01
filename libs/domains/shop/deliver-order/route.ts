import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { deliverOrder } from './handler';
import { deliverOrderParamSchema } from './validator';

export type Bindings = {
  DB: D1Database;
};

export const deliverOrderRoute = new Hono<{ Bindings: Bindings }>();

deliverOrderRoute.post(
  '/orders/:id/deliver',
  tbValidator('param', deliverOrderParamSchema, (result, c) => {
    if (!result.success) {
      return c.json({ success: false, error: 'Validation failed: ' + [...result.errors].map(e => `${(e as any).path || (e as any).instancePath?.replace(/^\//, '') || 'field'}: ${e.message}`).join(', ') }, 400);
    }
  }),
  async (c) => {
    if (!c.env || !c.env.DB) {
      return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    }
    const { id: idStr } = c.req.valid('param');
    const id = parseInt(idStr, 10);
    const db = createDb(c.env.DB);

    const updatedOrder = await deliverOrder(db, id);
    return c.json({ success: true, data: updatedOrder });
  }
);
