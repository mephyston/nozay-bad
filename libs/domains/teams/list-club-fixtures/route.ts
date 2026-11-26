import { Hono } from 'hono';
import { tbValidator } from '@hono/typebox-validator';
import { createDb } from '@nba/db';
import { listClubFixtures } from './handler';
import { listClubFixturesQuerySchema } from './validator';

export type Bindings = { DB: D1Database };

export const listClubFixturesRoute = new Hono<{ Bindings: Bindings }>();

listClubFixturesRoute.get(
  '/club-fixtures',
  tbValidator('query', listClubFixturesQuerySchema, (result, c) => {
    if (!result.success) return c.json({ success: false, error: 'Validation failed' }, 400);
  }),
  async (c) => {
    if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    return c.json({ success: true, data: await listClubFixtures(createDb(c.env.DB), c.req.valid('query')) });
  }
);
