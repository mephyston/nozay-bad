import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { amendOrder } from './handler';
import { amendOrderBodySchema, amendOrderParamSchema } from './validator';

export type Bindings = {
  DB: D1Database;
};

export const amendOrderRoute = new Hono<{ Bindings: Bindings }>();

const refus = (result: any, c: any) => {
  if (!result.success) {
    return c.json({ success: false, error: 'Validation failed: ' + [...result.errors].map((e: any) => `${e.path || e.instancePath?.replace(/^\//, '') || 'field'}: ${e.message}`).join(', ') }, 400);
  }
};

amendOrderRoute.put(
  '/orders/:id/amend',
  tbValidator('param', amendOrderParamSchema, refus),
  tbValidator('json', amendOrderBodySchema, refus),
  async (c) => {
    if (!c.env || !c.env.DB) {
      return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    }
    const id = parseInt(c.req.valid('param').id, 10);
    const updated = await amendOrder(createDb(c.env.DB), id, c.req.valid('json'));
    return c.json({ success: true, data: updated });
  }
);
