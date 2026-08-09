import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { cancelOrder } from './handler';
import { cancelOrderParamSchema } from './validator';

export type Bindings = {
  DB: D1Database;
};

export const cancelOrderRoute = new Hono<{ Bindings: Bindings }>();

cancelOrderRoute.post(
  '/orders/:id/cancel',
  tbValidator('param', cancelOrderParamSchema, (result, c) => {
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

    const updatedOrder = await cancelOrder(db, id);
    return c.json({ success: true, data: updatedOrder });
  }
);
