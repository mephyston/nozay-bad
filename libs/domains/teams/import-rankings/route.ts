import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { importRankings } from './handler';
import { importRankingsSchema } from './validator';

export type Bindings = { DB: D1Database };

export const importRankingsRoute = new Hono<{ Bindings: Bindings }>();

importRankingsRoute.post(
  '/rankings/import',
  tbValidator('json', importRankingsSchema, (result, c) => {
    if (!result.success) return c.json({ success: false, error: 'Validation failed' }, 400);
  }),
  async (c) => {
    if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    return c.json({
      success: true,
      data: await importRankings(createDb(c.env.DB), c.req.valid('json'))
    });
  }
);
