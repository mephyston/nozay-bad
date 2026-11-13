import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { openCashHandover } from './handler';
import { openCashHandoverSchema } from './validator';

export type Bindings = { DB: D1Database };

export const openCashHandoverRoute = new Hono<{ Bindings: Bindings }>();

openCashHandoverRoute.post(
  '/cash-handovers',
  tbValidator('json', openCashHandoverSchema, (result, c) => {
    if (!result.success) return c.json({ success: false, error: 'Remise invalide' }, 400);
  }),
  async (c) => {
    if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    const data = await openCashHandover(createDb(c.env.DB), c.req.header('x-user-email') ?? '', c.req.valid('json'));
    return c.json({ success: true, data }, 201);
  }
);
