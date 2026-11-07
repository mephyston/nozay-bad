import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { scanCard } from './handler';
import { scanCardSchema } from './validator';
import { refuseInvalid, tokenSecret } from '../shared/validation';

export const scanCardRoute = new Hono<{ Bindings: { DB: D1Database; BUVETTE_TOKEN_SECRET?: string } }>();

scanCardRoute.post('/cards/scan', tbValidator('json', scanCardSchema, refuseInvalid), async (c) => {
  const data = await scanCard(createDb(c.env.DB), tokenSecret(c), c.req.valid('json').qrToken);
  return c.json({ success: true, data });
});
