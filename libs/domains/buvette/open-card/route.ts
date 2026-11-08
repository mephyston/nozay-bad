import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { openCard } from './handler';
import { openCardSchema } from './validator';
import { refuseInvalid } from '../shared/validation';

export const openCardRoute = new Hono<{ Bindings: { DB: D1Database } }>();

openCardRoute.post('/cards/open', tbValidator('json', openCardSchema, refuseInvalid), async (c) => {
  const { email, termsVersion } = c.req.valid('json');
  return c.json({ success: true, data: await openCard(createDb(c.env.DB), email, termsVersion) });
});
