import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { withdrawOrder } from './handler';
import { withdrawOrderBodySchema, withdrawOrderParamSchema } from './validator';

export type Bindings = {
  DB: D1Database;
};

export const withdrawOrderRoute = new Hono<{ Bindings: Bindings }>();

const refus = (result: any, c: any) => {
  if (!result.success) {
    return c.json({ success: false, error: 'Validation failed: ' + [...result.errors].map((e: any) => `${e.path || e.instancePath?.replace(/^\//, '') || 'field'}: ${e.message}`).join(', ') }, 400);
  }
};

withdrawOrderRoute.post(
  '/orders/:id/withdraw',
  tbValidator('param', withdrawOrderParamSchema, refus),
  tbValidator('json', withdrawOrderBodySchema, refus),
  async (c) => {
    if (!c.env || !c.env.DB) {
      return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    }
    const id = parseInt(c.req.valid('param').id, 10);
    const updated = await withdrawOrder(createDb(c.env.DB), { id, memberId: c.req.valid('json').memberId });
    return c.json({ success: true, data: updated });
  }
);
