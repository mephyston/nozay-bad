import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { listProducts } from './handler';
import { listProductsQuerySchema } from './validator';

export type Bindings = {
  DB: D1Database;
};

export const listProductsRoute = new Hono<{ Bindings: Bindings }>();

listProductsRoute.get(
  '/products',
  tbValidator('query', listProductsQuerySchema, (result, c) => {
    if (!result.success) {
      return c.json({ success: false, error: 'Validation failed: ' + [...result.errors].map(e => `${(e as any).path || (e as any).instancePath?.replace(/^\//, '') || 'field'}: ${e.message}`).join(', ') }, 400);
    }
  }),
  async (c) => {
    if (!c.env || !c.env.DB) {
      return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    }
    const { category, active: activeStr } = c.req.valid('query');
    const db = createDb(c.env.DB);

    let active: boolean | undefined = undefined;
    if (activeStr === 'true') active = true;
    else if (activeStr === 'false') active = false;

    const products = await listProducts(db, { category, active });
    return c.json({ success: true, data: products });
  }
);
