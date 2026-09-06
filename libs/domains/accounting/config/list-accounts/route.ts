import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { listAccounts } from './handler';
import { listAccountsQuerySchema } from './validator';

export type Bindings = {
  DB: D1Database;
};

export const listAccountsRoute = new Hono<{ Bindings: Bindings }>();

listAccountsRoute.get(
  '/accounts',
  tbValidator('query', listAccountsQuerySchema, (result, c) => {
    if (!result.success) {
      return c.json({ success: false, error: 'Validation failed: ' + [...result.errors].map(e => `${(e as any).path || (e as any).instancePath?.replace(/^\//, '') || 'field'}: ${e.message}`).join(', ') }, 400);
    }
  }),
  async (c) => {
    if (!c.env || !c.env.DB) {
      return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    }
    const db = createDb(c.env.DB);
    try {
      const list = await listAccounts(db);
      return c.json({ success: true, data: list });
    } catch (err: unknown) {
      return c.json({ success: false, error: (err as Error).message }, 500);
    }
  }
);
