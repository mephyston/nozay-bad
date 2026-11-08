import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { openSession, setSessionCategory } from './handler';
import { openSessionSchema, sessionCategorySchema } from './validator';
import { actorEmail, refuseInvalid } from '../shared/validation';

export const openSessionRoute = new Hono<{ Bindings: { DB: D1Database } }>();

openSessionRoute.post('/sessions', tbValidator('json', openSessionSchema, refuseInvalid), async (c) => {
  const { openingFloatCents, accountingCategoryId } = c.req.valid('json');
  const data = await openSession(createDb(c.env.DB), { openingFloatCents, accountingCategoryId, openedByEmail: actorEmail(c) });
  return c.json({ success: true, data });
});

openSessionRoute.put('/sessions/current/category', tbValidator('json', sessionCategorySchema, refuseInvalid), async (c) => {
  return c.json({ success: true, data: await setSessionCategory(createDb(c.env.DB), c.req.valid('json').accountingCategoryId) });
});
