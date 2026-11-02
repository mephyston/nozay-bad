import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { publishRosters } from './handler';
import { publishRostersSchema } from './validator';

export type Bindings = { DB: D1Database };

export const publishRostersRoute = new Hono<{ Bindings: Bindings }>();

publishRostersRoute.put(
  '/rosters-publication',
  tbValidator('json', publishRostersSchema, (result, c) => {
    if (!result.success) return c.json({ success: false, error: 'Validation failed' }, 400);
  }),
  async (c) => {
    if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    return c.json({ success: true, data: await publishRosters(createDb(c.env.DB), c.req.valid('json')) });
  }
);
