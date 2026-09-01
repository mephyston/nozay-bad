import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { listBankStatementLines } from './handler';
import { listBankStatementLinesQuerySchema } from './validator';

export type Bindings = {
  DB: D1Database;
};

export const listBankStatementLinesRoute = new Hono<{ Bindings: Bindings }>();

const handleListBank = async (c: any) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const { season, status, accountId, limit, offset, startDate, endDate } = c.req.valid('query');
  const db = createDb(c.env.DB);
  const data = await listBankStatementLines(db, {
    seasonId: season,
    filters: { status, accountId, limit, offset, startDate, endDate }
  } as any);
  return c.json({ success: true, data });
};

const bankQueryValidator = tbValidator('query', listBankStatementLinesQuerySchema, (result, c) => {
  if (!result.success) {
    return c.json({ success: false, error: 'Validation failed: ' + [...result.errors].map(e => `${(e as any).path || (e as any).instancePath?.replace(/^\//, '') || 'field'}: ${e.message}`).join(', ') }, 400);
  }
});

listBankStatementLinesRoute.get('/bank-statement-lines', bankQueryValidator, handleListBank);
listBankStatementLinesRoute.get('/bank-transactions', bankQueryValidator, handleListBank);

