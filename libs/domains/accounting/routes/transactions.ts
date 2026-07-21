import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { listTransactions } from '../queries/list-transactions/handler';
import { createTransaction } from '../commands/create-transaction/handler';
import { updateTransaction } from '../commands/update-transaction/handler';
import { deleteTransaction } from '../commands/delete-transaction/handler';
import type { Bindings } from '../index';

export const transactionsRouter = new Hono<{ Bindings: Bindings }>();

transactionsRouter.get('/', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const seasonId = c.req.query('season');
  const unreconciledChequesOnly = c.req.query('unreconciledCheques') === 'true';

  if (!seasonId && !unreconciledChequesOnly) {
    return c.json({ success: false, error: 'Missing season query parameter' }, 400);
  }
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');

  const accountId = c.req.query('accountId');
  const type = c.req.query('type');
  const category = c.req.query('category');
  const classCode = c.req.query('classCode');
  const memberId = c.req.query('memberId');

  const db = drizzle(c.env.DB);
  const result = await listTransactions(db, {
    seasonId,
    accountId,
    type,
    category,
    classCode,
    memberId,
    unreconciledChequesOnly
  }, { page, limit });

  return c.json({
    success: true,
    ...result
  });
});

transactionsRouter.post('/', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  const data = await createTransaction(db, body);
  return c.json({ success: true, data });
});

transactionsRouter.put('/:id', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const id = parseInt(c.req.param('id'));
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  const data = await updateTransaction(db, id, body);
  return c.json({ success: true, data });
});

transactionsRouter.delete('/:id', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) {
    return c.json({ success: false, error: 'Invalid ID' }, 400);
  }
  const db = drizzle(c.env.DB);
  await deleteTransaction(db, id);
  return c.json({ success: true });
});
