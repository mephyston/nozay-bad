import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { deleteProduct } from './handler';

export type Bindings = { DB: D1Database };

export const deleteProductRoute = new Hono<{ Bindings: Bindings }>();

deleteProductRoute.delete('/products/:id', async (c) => {
  if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) return c.json({ success: false, error: 'Identifiant invalide' }, 400);
  await deleteProduct(createDb(c.env.DB), id);
  return c.json({ success: true });
});
