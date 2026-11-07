import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { openSession } from './handler';
import { openSessionSchema } from './validator';
import { actorEmail, refuseInvalid } from '../shared/validation';

export const openSessionRoute = new Hono<{ Bindings: { DB: D1Database } }>();

openSessionRoute.post('/sessions', tbValidator('json', openSessionSchema, refuseInvalid), async (c) => {
  const { openingFloatCents } = c.req.valid('json');
  const data = await openSession(createDb(c.env.DB), { openingFloatCents, openedByEmail: actorEmail(c) });
  return c.json({ success: true, data });
});
