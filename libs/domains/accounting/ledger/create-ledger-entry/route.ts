import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { createLedgerEntry } from './handler';
import { createTransactionSchema } from './validator';

export type Bindings = {
  DB: D1Database;
};

export const createTransactionRoute = new Hono<{ Bindings: Bindings }>();

const handleCreate = async (c: any) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const body = c.req.valid('json');
  const db = createDb(c.env.DB);
  try {
    const data = await createLedgerEntry(db, body);
    return c.json({ success: true, data });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 400);
  }
};

const createValidator = tbValidator('json', createTransactionSchema, (result, c) => {
  if (!result.success) {
    return c.json({ success: false, error: 'Validation failed: ' + [...result.errors].map(e => `${(e as any).path || (e as any).instancePath?.replace(/^\//, '') || 'field'}: ${e.message}`).join(', ') }, 400);
  }
});

createTransactionRoute.post('/ledger-entries', createValidator, handleCreate);
createTransactionRoute.post('/transactions', createValidator, handleCreate);

