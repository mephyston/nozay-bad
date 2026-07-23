import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { listChecks, listCheckDeposits } from './handler';
import { listChecksQuerySchema } from './validator';

export type Bindings = {
  DB: D1Database;
};

export const listChecksRoute = new Hono<{ Bindings: Bindings }>();

listChecksRoute.get(
  '/checks',
  tbValidator('query', listChecksQuerySchema, (result, c) => {
    if (!result.success) {
      return c.json({ success: false, error: 'Validation failed: ' + [...result.errors].map(e => `${(e as any).path || (e as any).instancePath?.replace(/^\//, '') || 'field'}: ${e.message}`).join(', ') }, 400);
    }
  }),
  async (c) => {
    if (!c.env || !c.env.DB) {
      return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    }
    const { season, status } = c.req.valid('query');
    const db = createDb(c.env.DB);
    const data = await listChecks(db, season, status);
    return c.json({ success: true, data });
  }
);

listChecksRoute.get(
  '/check-deposits',
  tbValidator('query', listChecksQuerySchema, (result, c) => {
    if (!result.success) {
      return c.json({ success: false, error: 'Validation failed: ' + [...result.errors].map(e => `${(e as any).path || (e as any).instancePath?.replace(/^\//, '') || 'field'}: ${e.message}`).join(', ') }, 400);
    }
  }),
  async (c) => {
    if (!c.env || !c.env.DB) {
      return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    }
    const { season } = c.req.valid('query');
    const db = createDb(c.env.DB);
    const data = await listCheckDeposits(db, season);
    return c.json({ success: true, data });
  }
);
