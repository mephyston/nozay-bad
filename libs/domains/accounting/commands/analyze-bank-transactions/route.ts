import { Hono } from 'hono';
import { createDb } from '@metacult/shared-db';
import { tbValidator } from '@hono/typebox-validator';
import { analyzeBankTransactions } from './handler';
import { analyzeBankTransactionsQuerySchema } from './validator';

export type Bindings = {
  DB: D1Database;
  AI: any;
};

export const analyzeBankTransactionsRoute = new Hono<{ Bindings: Bindings }>();

analyzeBankTransactionsRoute.post(
  '/bank-transactions/analyze',
  tbValidator('query', analyzeBankTransactionsQuerySchema, (result, c) => {
    if (!result.success) {
      return c.json({ success: false, error: 'Validation failed: ' + [...result.errors].map(e => `${e.instancePath?.replace(/^\//, '') || 'field'}: ${e.message}`).join(', ') }, 400);
    }
  }),
  async (c) => {
    if (!c.env || !c.env.DB || !c.env.AI) {
      return c.json({ success: false, error: 'Database or AI binding is missing' }, 500);
    }
    const { season, id } = c.req.valid('query');
    const idNum = id ? parseInt(id) : undefined;
    const db = createDb(c.env.DB);
    const result = await analyzeBankTransactions(db, c.env.AI, { seasonId: season, singleId: idNum });
    return c.json({ success: true, ...result });
  }
);
