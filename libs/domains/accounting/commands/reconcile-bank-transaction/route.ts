import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { tbValidator } from '@hono/typebox-validator';
import { reconcileBankTransaction, reconcileBulkTransactions } from './handler';
import { reconcileBankTransactionSchema, reconcileBulkTransactionsSchema } from './validator';

export type Bindings = {
  DB: D1Database;
};

export const reconcileBankTransactionRoute = new Hono<{ Bindings: Bindings }>();

reconcileBankTransactionRoute.post(
  '/bank-transactions/reconcile-bulk',
  tbValidator('json', reconcileBulkTransactionsSchema, (result, c) => {
    if (!result.success) {
      return c.json({ success: false, error: 'Validation failed: ' + [...result.errors].map(e => `${e.instancePath?.replace(/^\//, '') || 'field'}: ${e.message}`).join(', ') }, 400);
    }
  }),
  async (c) => {
    if (!c.env || !c.env.DB) {
      return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    }
    const body = c.req.valid('json');
    const db = drizzle(c.env.DB);
    try {
      const count = await reconcileBulkTransactions(db, body.requests);
      return c.json({ success: true, count });
    } catch (err: any) {
      return c.json({ success: false, error: err.message }, 400);
    }
  }
);

reconcileBankTransactionRoute.post(
  '/bank-transactions/:id/reconcile',
  tbValidator('json', reconcileBankTransactionSchema, (result, c) => {
    if (!result.success) {
      return c.json({ success: false, error: 'Validation failed: ' + [...result.errors].map(e => `${e.instancePath?.replace(/^\//, '') || 'field'}: ${e.message}`).join(', ') }, 400);
    }
  }),
  async (c) => {
    if (!c.env || !c.env.DB) {
      return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    }
    const id = parseInt(c.req.param('id'));
    const body = c.req.valid('json');
    const db = drizzle(c.env.DB);
    try {
      await reconcileBankTransaction(db, id, body);
      return c.json({ success: true });
    } catch (err: any) {
      return c.json({ success: false, error: err.message }, 400);
    }
  }
);
