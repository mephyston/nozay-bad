import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { listLedgerEntries } from './handler';
import { listTransactionsQuerySchema } from './validator';

export type Bindings = {
  DB: D1Database;
};

export const listTransactionsRoute = new Hono<{ Bindings: Bindings }>();

const handleList = async (c: any) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const query = c.req.valid('query');
  const seasonId = query.season;
  const unreconciledChequesOnly = query.unreconciledCheques === 'true';

  if (!seasonId && !unreconciledChequesOnly) {
    return c.json({ success: false, error: 'Missing season query parameter' }, 400);
  }
  const page = parseInt(query.page || '1', 10);
  const rawLimit = parseInt(query.limit || '20', 10);
  const limit = Math.min(Math.max(1, rawLimit), 100);

  const accountId = query.accountId;
  const type = query.type;
  const category = query.category;
  const classCode = query.classCode;
  const memberId = query.memberId;

  const db = createDb(c.env.DB);
  const result = await listLedgerEntries(db, {
    seasonId,
    accountId,
    type,
    category,
    classCode,
    memberId,
    unreconciledChequesOnly
  }, { page, limit });

  return c.json({ success: true, ...result });
};

const validator = tbValidator('query', listTransactionsQuerySchema, (result, c) => {
  if (!result.success) {
    return c.json({ success: false, error: 'Validation failed: ' + [...result.errors].map(e => `${(e as any).path || (e as any).instancePath?.replace(/^\//, '') || 'field'}: ${e.message}`).join(', ') }, 400);
  }
});

listTransactionsRoute.get('/ledger-entries', validator, handleList);
listTransactionsRoute.get('/transactions', validator, handleList);
