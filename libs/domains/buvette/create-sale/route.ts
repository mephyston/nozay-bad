import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { createSale } from './handler';
import { createSaleSchema } from './validator';
import { actorEmail, refuseInvalid, tokenSecret } from '../shared/validation';

export const createSaleRoute = new Hono<{ Bindings: { DB: D1Database; BUVETTE_TOKEN_SECRET?: string } }>();

createSaleRoute.post('/sales', tbValidator('json', createSaleSchema, refuseInvalid), async (c) => {
  const data = await createSale(createDb(c.env.DB), tokenSecret(c), { ...c.req.valid('json'), createdByEmail: actorEmail(c) });
  return c.json({ success: true, data });
});
