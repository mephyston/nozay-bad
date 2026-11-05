import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { saveCalendarFeed } from './handler';
import { saveCalendarFeedBodySchema } from './validator';

export type Bindings = { DB: D1Database };

export const saveCalendarFeedRoute = new Hono<{ Bindings: Bindings }>();

saveCalendarFeedRoute.put(
  '/calendar-feed',
  tbValidator('json', saveCalendarFeedBodySchema, (result, c) => {
    if (!result.success) return c.json({ success: false, error: 'Licence ou empreinte invalide' }, 400);
  }),
  async (c) => {
    if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    return c.json({ success: true, data: await saveCalendarFeed(createDb(c.env.DB), c.req.valid('json')) });
  }
);
