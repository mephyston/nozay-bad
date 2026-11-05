import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { getCalendarFeed } from './handler';
import { calendarFeedLicenceQuerySchema } from './validator';

export type Bindings = { DB: D1Database };

export const getCalendarFeedRoute = new Hono<{ Bindings: Bindings }>();

getCalendarFeedRoute.get(
  '/calendar-feed',
  tbValidator('query', calendarFeedLicenceQuerySchema, (result, c) => {
    if (!result.success) return c.json({ success: false, error: 'Licence requise' }, 400);
  }),
  async (c) => {
    if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    return c.json({ success: true, data: await getCalendarFeed(createDb(c.env.DB), c.req.valid('query').licence) });
  }
);
