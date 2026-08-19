import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { reconcileBankStatementLine, reconcileBulkTransactions } from './handler';
import { reconcileBankTransactionSchema, reconcileBulkTransactionsSchema } from './validator';

export type Bindings = {
  DB: D1Database;
};

export const reconcileBankStatementLineRoute = new Hono<{ Bindings: Bindings }>();

const handleBulk = async (c: any) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const body = c.req.valid('json');
  const db = createDb(c.env.DB);
  try {
    const count = await reconcileBulkTransactions(db, body.requests);
    return c.json({ success: true, count });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, err.status || 400);
  }
};

const handleReconcile = async (c: any) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const id = parseInt(c.req.param('id'));
  const body = c.req.valid('json');
  const db = createDb(c.env.DB);
  try {
    await reconcileBankStatementLine(db, id, body);
    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, err.status || 400);
  }
};

const bulkValidator = tbValidator('json', reconcileBulkTransactionsSchema, (result, c) => {
  if (!result.success) {
    return c.json({ success: false, error: 'Validation failed: ' + [...result.errors].map(e => `${(e as any).path || (e as any).instancePath?.replace(/^\//, '') || 'field'}: ${e.message}`).join(', ') }, 400);
  }
});

const reconcileValidator = tbValidator('json', reconcileBankTransactionSchema, (result, c) => {
  if (!result.success) {
    return c.json({ success: false, error: 'Validation failed: ' + [...result.errors].map(e => `${(e as any).path || (e as any).instancePath?.replace(/^\//, '') || 'field'}: ${e.message}`).join(', ') }, 400);
  }
});

const idCheckMiddleware = async (c: any, next: any) => {
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) {
    return c.json({ success: false, error: 'Identifiant invalide' }, 400);
  }
  await next();
};

reconcileBankStatementLineRoute.post('/bank-statement-lines/reconcile-bulk', bulkValidator, handleBulk);
reconcileBankStatementLineRoute.post('/bank-transactions/reconcile-bulk', bulkValidator, handleBulk);

reconcileBankStatementLineRoute.post('/bank-statement-lines/:id/reconcile', idCheckMiddleware, reconcileValidator, handleReconcile);
reconcileBankStatementLineRoute.post('/bank-transactions/:id/reconcile', idCheckMiddleware, reconcileValidator, handleReconcile);

