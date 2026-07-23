import { Hono } from 'hono';
import { createDb } from '@metacult/shared-db';
import { listProducts } from './handler';

export type Bindings = {
  DB: D1Database;
};

export const listProductsRoute = new Hono<{ Bindings: Bindings }>();

listProductsRoute.get('/products', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const category = c.req.query('category');
  const activeStr = c.req.query('active');
  const db = createDb(c.env.DB);

  let active: boolean | undefined = undefined;
  if (activeStr === 'true') active = true;
  else if (activeStr === 'false') active = false;

  const products = await listProducts(db, { category, active });
  return c.json({ success: true, data: products });
});
