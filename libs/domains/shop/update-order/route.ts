import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { updateOrder } from './handler';
import { updateOrderBodySchema, updateOrderParamSchema } from './validator';

export type Bindings = {
  DB: D1Database;
};

export const updateOrderRoute = new Hono<{ Bindings: Bindings }>();

const refus = (result: any, c: any) => {
  if (!result.success) {
    return c.json({ success: false, error: 'Validation failed: ' + [...result.errors].map((e: any) => `${e.path || e.instancePath?.replace(/^\//, '') || 'field'}: ${e.message}`).join(', ') }, 400);
  }
};

updateOrderRoute.put(
  '/orders/:id',
  tbValidator('param', updateOrderParamSchema, refus),
  tbValidator('json', updateOrderBodySchema, refus),
  async (c) => {
    if (!c.env || !c.env.DB) {
      return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    }
    const id = parseInt(c.req.valid('param').id, 10);
    const updated = await updateOrder(createDb(c.env.DB), id, c.req.valid('json'));
    return c.json({ success: true, data: updated });
  }
);
