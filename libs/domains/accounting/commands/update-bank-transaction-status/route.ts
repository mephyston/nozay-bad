import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { updateBankTransactionStatus } from './handler';

export type Bindings = {
  DB: D1Database;
};

export const updateBankTransactionStatusRoute = new Hono<{ Bindings: Bindings }>();

updateBankTransactionStatusRoute.post('/bank-transactions/:id/ignore', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const id = parseInt(c.req.param('id'));
  const db = createDb(c.env.DB);
  await updateBankTransactionStatus(db, { id, status: 'ignored' });
  return c.json({ success: true });
});

updateBankTransactionStatusRoute.post('/bank-transactions/:id/unignore', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const id = parseInt(c.req.param('id'));
  const db = createDb(c.env.DB);
  await updateBankTransactionStatus(db, { id, status: 'pending' });
  return c.json({ success: true });
});
