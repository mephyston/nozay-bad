import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { listBankStatementLines } from './handler';
import { listBankStatementLinesQuerySchema } from './validator';

export type Bindings = {
  DB: D1Database;
};

export const listBankStatementLinesRoute = new Hono<{ Bindings: Bindings }>();

listBankStatementLinesRoute.get(
  '/bank-statement-lines',
  tbValidator('query', listBankStatementLinesQuerySchema, (result, c) => {
    if (!result.success) {
      return c.json({ success: false, error: 'Validation failed: ' + [...result.errors].map(e => `${(e as any).path || (e as any).instancePath?.replace(/^\//, '') || 'field'}: ${e.message}`).join(', ') }, 400);
    }
  }),
  async (c) => {
    if (!c.env || !c.env.DB) {
      return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    }
    const { season, status, accountId } = c.req.valid('query');
    const db = createDb(c.env.DB);
    const data = await listBankStatementLines(db, { seasonId: season, filters: { status, accountId } } as any);
    return c.json({ success: true, data });
  }
);
