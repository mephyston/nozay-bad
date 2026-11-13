import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { openCashReceipt } from './handler';
import { openCashReceiptSchema } from './validator';

export type Bindings = { DB: D1Database };

export const openCashReceiptRoute = new Hono<{ Bindings: Bindings }>();

openCashReceiptRoute.post(
  '/cash-receipts',
  tbValidator('json', openCashReceiptSchema, (result, c) => {
    if (!result.success) return c.json({ success: false, error: 'Encaissement invalide' }, 400);
  }),
  async (c) => {
    if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    const data = await openCashReceipt(createDb(c.env.DB), c.req.header('x-user-email') ?? '', c.req.valid('json'));
    return c.json({ success: true, data }, 201);
  }
);
