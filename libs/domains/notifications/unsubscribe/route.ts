import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { unsubscribeFromPush } from './handler';
import { unsubscribeBodySchema } from './validator';

export type Bindings = {
  DB: D1Database;
};

export const unsubscribeRoute = new Hono<{ Bindings: Bindings }>();

unsubscribeRoute.delete(
  '/subscriptions',
  tbValidator('json', unsubscribeBodySchema, (result, c) => {
    if (!result.success) {
      return c.json({ success: false, error: 'Désabonnement invalide.' }, 400);
    }
  }),
  async (c) => {
    if (!c.env?.DB) {
      return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    }
    const { email, endpoint } = c.req.valid('json');
    const db = createDb(c.env.DB);

    const result = await unsubscribeFromPush(db, { email, endpoint });
    return c.json({ success: true, data: result });
  }
);
