import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { listExpenses } from './handler';
import { listExpensesQuerySchema } from './validator';

export type Bindings = {
  DB: D1Database;
};

export const listExpensesRoute = new Hono<{ Bindings: Bindings }>();

listExpensesRoute.get(
  '/',
  tbValidator('query', listExpensesQuerySchema, (result, c) => {
    if (!result.success) {
      return c.json({ success: false, error: 'Validation failed: ' + [...result.errors].map(e => `${(e as any).path || (e as any).instancePath?.replace(/^\//, '') || 'field'}: ${e.message}`).join(', ') }, 400);
    }
  }),
  async (c) => {
    if (!c.env || !c.env.DB) {
      return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    }
    const { season, status, memberId } = c.req.valid('query');
    const db = createDb(c.env.DB);

    const expenses = await listExpenses(db, { season, status, memberId: memberId ? parseInt(memberId, 10) : undefined });
    return c.json({ success: true, data: expenses });
  }
);
