import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { subscribeToPush } from './handler';
import { subscribeBodySchema } from './validator';

export type Bindings = {
  DB: D1Database;
};

export const subscribeRoute = new Hono<{ Bindings: Bindings }>();

subscribeRoute.post(
  '/subscriptions',
  tbValidator('json', subscribeBodySchema, (result, c) => {
    if (!result.success) {
      return c.json({ success: false, error: 'Abonnement push invalide.' }, 400);
    }
  }),
  async (c) => {
    if (!c.env?.DB) {
      return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    }
    const { email, endpoint, keys, userAgent } = c.req.valid('json');
    const db = createDb(c.env.DB);

    const result = await subscribeToPush(db, {
      email,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      userAgent
    });

    return c.json({ success: true, data: result });
  }
);
