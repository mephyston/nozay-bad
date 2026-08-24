import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { getReconciliationStatement, getReconciliationStatements } from './handler';
import { getReconciliationStatementParamSchema, getReconciliationStatementQuerySchema } from './validator';

export type Bindings = {
  DB: D1Database;
};

export const getReconciliationStatementRoute = new Hono<{ Bindings: Bindings }>();

const validationFailed = (result: any, c: any) => {
  if (!result.success) {
    return c.json({ success: false, error: 'Validation failed: ' + [...result.errors].map((e: any) => `${e.path || e.instancePath?.replace(/^\//, '') || 'field'}: ${e.message}`).join(', ') }, 400);
  }
};

getReconciliationStatementRoute.get(
  '/accounts/:accountCode/reconciliation-statement',
  tbValidator('param', getReconciliationStatementParamSchema, validationFailed),
  tbValidator('query', getReconciliationStatementQuerySchema, validationFailed),
  async (c) => {
    if (!c.env || !c.env.DB) {
      return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    }
    const { accountCode } = c.req.valid('param');
    const { season, date } = c.req.valid('query');
    const db = createDb(c.env.DB);
    try {
      const data = await getReconciliationStatement(db, { accountCode, seasonId: season, date });
      return c.json({ success: true, data });
    } catch (err: any) {
      return c.json({ success: false, error: err.message }, err.status || 500);
    }
  }
);

getReconciliationStatementRoute.get(
  '/reconciliation-statements',
  tbValidator('query', getReconciliationStatementQuerySchema, validationFailed),
  async (c) => {
    if (!c.env || !c.env.DB) {
      return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    }
    const { season, date } = c.req.valid('query');
    const db = createDb(c.env.DB);
    try {
      const data = await getReconciliationStatements(db, { seasonId: season, date });
      return c.json({ success: true, data });
    } catch (err: any) {
      return c.json({ success: false, error: err.message }, err.status || 500);
    }
  }
);
