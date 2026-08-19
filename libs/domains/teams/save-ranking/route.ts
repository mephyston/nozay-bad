import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { saveRanking } from './handler';
import { saveRankingSchema } from './validator';

export type Bindings = { DB: D1Database };

export const saveRankingRoute = new Hono<{ Bindings: Bindings }>();

saveRankingRoute.put(
  '/rankings/:licence',
  tbValidator('json', saveRankingSchema, (result, c) => {
    if (!result.success) return c.json({ success: false, error: 'Validation failed' }, 400);
  }),
  async (c) => {
    if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);

    const licence = c.req.param('licence');
    if (!licence) return c.json({ success: false, error: 'Licence requise.' }, 400);

    return c.json({
      success: true,
      data: await saveRanking(createDb(c.env.DB), { licence, ...c.req.valid('json') })
    });
  }
);
