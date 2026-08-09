import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { payOrder } from './handler';
import { payOrderParamSchema } from './validator';

export type Bindings = {
  DB: D1Database;
};

export const payOrderRoute = new Hono<{ Bindings: Bindings }>();

payOrderRoute.post(
  '/orders/:id/pay',
  tbValidator('param', payOrderParamSchema, (result, c) => {
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

    const body = await c.req.json().catch(() => ({})) as { paidAt?: string };
    const updatedOrder = await payOrder(db, body?.paidAt ? { id, paidAt: body.paidAt } : id);
    return c.json({ success: true, data: updatedOrder });
  }
);
