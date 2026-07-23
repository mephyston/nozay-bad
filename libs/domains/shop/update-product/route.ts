import { Hono } from 'hono';
import { createDb } from '@metacult/shared-db';
import { tbValidator } from '@hono/typebox-validator';
import { updateProduct } from './handler';
import { updateProductSchema } from './validator';

export type Bindings = {
  DB: D1Database;
};

export const updateProductRoute = new Hono<{ Bindings: Bindings }>();

updateProductRoute.put('/products/:id', tbValidator('json', updateProductSchema, (result, c) => {
  if (!result.success) {
    return c.json({ success: false, error: 'Validation failed: ' + [...result.errors].map(e => `${e.instancePath?.replace(/^\//, '') || 'field'}: ${e.message}`).join(', ') }, 400);
  }
}), async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) {
    return c.json({ success: false, error: 'Identifiant invalide' }, 400);
  }
  const body = c.req.valid('json');
  const db = createDb(c.env.DB);

  const prod = await updateProduct(db, id, body);
  return c.json({ success: true, data: prod });
});
