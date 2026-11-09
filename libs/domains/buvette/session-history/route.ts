import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { getSessionReport, listSessionHistory } from './handler';
import { sessionIdParamSchema } from './validator';
import { refuseInvalid } from '../shared/validation';

export const sessionHistoryRoute = new Hono<{ Bindings: { DB: D1Database } }>();

sessionHistoryRoute.get('/sessions/history', async (c) => {
  return c.json({ success: true, data: await listSessionHistory(createDb(c.env.DB)) });
});

sessionHistoryRoute.get('/sessions/:id/report', tbValidator('param', sessionIdParamSchema, refuseInvalid), async (c) => {
  return c.json({ success: true, data: await getSessionReport(createDb(c.env.DB), Number(c.req.valid('param').id)) });
});
