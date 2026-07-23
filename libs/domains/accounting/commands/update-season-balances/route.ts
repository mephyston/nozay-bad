import { Hono } from 'hono';
import { createDb } from '@metacult/shared-db';
import { tbValidator } from '@hono/typebox-validator';
import { updateSeasonBalances } from './handler';
import { updateSeasonBalancesSchema } from './validator';

export type Bindings = {
  DB: D1Database;
};

export const updateSeasonBalancesRoute = new Hono<{ Bindings: Bindings }>();

updateSeasonBalancesRoute.post(
  '/:seasonId/balances',
  tbValidator('json', updateSeasonBalancesSchema, (result, c) => {
    if (!result.success) {
      return c.json({ success: false, error: 'Validation failed: ' + [...result.errors].map(e => `${e.instancePath?.replace(/^\//, '') || 'field'}: ${e.message}`).join(', ') }, 400);
    }
  }),
  async (c) => {
    if (!c.env || !c.env.DB) {
      return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    }
    const seasonId = c.req.param('seasonId');
    const body = c.req.valid('json');
    const db = createDb(c.env.DB);
    try {
      await updateSeasonBalances(db, seasonId, body);
      return c.json({ success: true });
    } catch (err: any) {
      return c.json({ success: false, error: err.message }, 400);
    }
  }
);
