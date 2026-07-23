import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { createProduct } from './handler';
import { createProductSchema } from './validator';

export type Bindings = {
  DB: D1Database;
};

export const createProductRoute = new Hono<{ Bindings: Bindings }>();

createProductRoute.post('/products', tbValidator('json', createProductSchema, (result, c) => {
  if (!result.success) {
    return c.json({ success: false, error: 'Validation failed: ' + [...result.errors].map(e => `${(e as any).path || (e as any).instancePath?.replace(/^\//, '') || 'field'}: ${e.message}`).join(', ') }, 400);
  }
}), async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const body = c.req.valid('json');
  const db = createDb(c.env.DB);
  const prod = await createProduct(db, body);
  return c.json({ success: true, data: prod });
});
