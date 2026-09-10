import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { generateIndivSessions } from './handler';
import { generateIndivSessionsSchema } from './validator';

export type Bindings = { DB: D1Database };

export const generateIndivSessionsRoute = new Hono<{ Bindings: Bindings }>();

generateIndivSessionsRoute.post(
  '/indiv/generate',
  tbValidator('json', generateIndivSessionsSchema, (result, c) => {
    if (!result.success) return c.json({ success: false, error: 'Validation failed' }, 400);
  }),
  async (c) => {
    if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    return c.json({ success: true, data: await generateIndivSessions(createDb(c.env.DB), c.req.valid('json')) });
  }
);
