import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { analyzeBankStatementLines } from './handler';
import { analyzeBankStatementLinesQuerySchema } from './validator';

export type Bindings = {
  DB: D1Database;
  AI: unknown;
};

export const analyzeBankStatementLinesRoute = new Hono<{ Bindings: Bindings }>();

const handleAnalyze = async (c: any) => {
  if (!c.env || !c.env.DB || !c.env.AI) {
    return c.json({ success: false, error: 'Database or AI binding is missing' }, 500);
  }
  const { season, id } = c.req.valid('query');
  const idNum = id ? parseInt(id) : undefined;
  const db = createDb(c.env.DB);
  const result = await analyzeBankStatementLines(db, c.env.AI, { seasonId: season, singleId: idNum });
  return c.json({ success: true, ...result });
};

const analyzeValidator = tbValidator('query', analyzeBankStatementLinesQuerySchema, (result, c) => {
  if (!result.success) {
    return c.json({ success: false, error: 'Validation failed: ' + [...result.errors].map(e => `${(e as any).path || (e as any).instancePath?.replace(/^\//, '') || 'field'}: ${e.message}`).join(', ') }, 400);
  }
});

analyzeBankStatementLinesRoute.post('/bank-statement-lines/analyze', analyzeValidator, handleAnalyze);
analyzeBankStatementLinesRoute.post('/bank-transactions/analyze', analyzeValidator, handleAnalyze);

