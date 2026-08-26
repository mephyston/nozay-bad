import { Hono } from 'hono';
import { createDb, AppError } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { createInternalTransfer } from './handler';
import { createInternalTransferSchema } from './validator';

export type Bindings = {
  DB: D1Database;
};

export const createInternalTransferRoute = new Hono<{ Bindings: Bindings }>();

const handleCreate = async (c: any) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const body = c.req.valid('json');
  const db = createDb(c.env.DB);
  try {
    const data = await createInternalTransfer(db, body);
    return c.json({ success: true, data });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, err instanceof AppError ? err.status : 400);
  }
};

const createValidator = tbValidator('json', createInternalTransferSchema, (result, c) => {
  if (!result.success) {
    return c.json({ success: false, error: 'Validation failed: ' + [...result.errors].map(e => `${(e as any).path || (e as any).instancePath?.replace(/^\//, '') || 'field'}: ${e.message}`).join(', ') }, 400);
  }
});

createInternalTransferRoute.post('/internal-transfers', createValidator, handleCreate);
