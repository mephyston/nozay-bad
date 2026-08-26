import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { updateBankStatementLineStatus } from './handler';
import { updateBankTransactionStatusParamSchema } from './validator';

export type Bindings = {
  DB: D1Database;
};

export const updateBankStatementLineStatusRoute = new Hono<{ Bindings: Bindings }>();

const handleIgnore = async (c: any) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const { id: idStr } = c.req.valid('param');
  const id = parseInt(idStr, 10);
  const db = createDb(c.env.DB);
  await updateBankStatementLineStatus(db, { id, status: 'ignored' });
  return c.json({ success: true });
};

const handleUnignore = async (c: any) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const { id: idStr } = c.req.valid('param');
  const id = parseInt(idStr, 10);
  const db = createDb(c.env.DB);
  await updateBankStatementLineStatus(db, { id, status: 'pending' });
  return c.json({ success: true });
};

const statusValidator = tbValidator('param', updateBankTransactionStatusParamSchema, (result, c) => {
  if (!result.success) {
    return c.json({ success: false, error: 'Validation failed: ' + [...result.errors].map(e => `${(e as any).path || (e as any).instancePath?.replace(/^\//, '') || 'field'}: ${e.message}`).join(', ') }, 400);
  }
});

updateBankStatementLineStatusRoute.post('/bank-statement-lines/:id/ignore', statusValidator, handleIgnore);
updateBankStatementLineStatusRoute.post('/bank-transactions/:id/ignore', statusValidator, handleIgnore);

updateBankStatementLineStatusRoute.post('/bank-statement-lines/:id/unignore', statusValidator, handleUnignore);
updateBankStatementLineStatusRoute.post('/bank-transactions/:id/unignore', statusValidator, handleUnignore);

