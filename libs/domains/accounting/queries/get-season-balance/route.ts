import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { getSeasonBalance } from './handler';
import { getSeasonBalanceParamSchema } from './validator';

export type Bindings = {
  DB: D1Database;
};

export const getSeasonBalanceRoute = new Hono<{ Bindings: Bindings }>();

getSeasonBalanceRoute.get(
  '/:seasonId/balance',
  tbValidator('param', getSeasonBalanceParamSchema, (result, c) => {
    if (!result.success) {
      return c.json({ success: false, error: 'Validation failed: ' + [...result.errors].map(e => `${(e as any).path || (e as any).instancePath?.replace(/^\//, '') || 'field'}: ${e.message}`).join(', ') }, 400);
    }
  }),
  async (c) => {
    if (!c.env || !c.env.DB) {
      return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    }
    const { seasonId } = c.req.valid('param');
    const db = createDb(c.env.DB);
    const data = await getSeasonBalance(db, seasonId);
    return c.json({ success: true, data });
  }
);
