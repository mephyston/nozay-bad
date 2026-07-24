import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { deleteLedgerEntry } from './handler';
import { deleteTransactionParamSchema } from './validator';

export type Bindings = {
  DB: D1Database;
};

export const deleteTransactionRoute = new Hono<{ Bindings: Bindings }>();

const handleDelete = async (c: any) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const { id: idStr } = c.req.valid('param');
  const id = parseInt(idStr, 10);
  const db = createDb(c.env.DB);
  await deleteLedgerEntry(db, id);
  return c.json({ success: true });
};

deleteTransactionRoute.delete(
  '/ledger-entries/:id',
  tbValidator('param', deleteTransactionParamSchema, (result, c) => {
    if (!result.success) {
      return c.json({ success: false, error: 'Validation failed: ' + [...result.errors].map(e => `${(e as any).path || (e as any).instancePath?.replace(/^\//, '') || 'field'}: ${e.message}`).join(', ') }, 400);
    }
  }),
  handleDelete
);

deleteTransactionRoute.delete(
  '/ledger/:id',
  tbValidator('param', deleteTransactionParamSchema, (result, c) => {
    if (!result.success) {
      return c.json({ success: false, error: 'Validation failed: ' + [...result.errors].map(e => `${(e as any).path || (e as any).instancePath?.replace(/^\//, '') || 'field'}: ${e.message}`).join(', ') }, 400);
    }
  }),
  handleDelete
);
