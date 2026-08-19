import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { saveVenue } from './handler';
import { saveVenueSchema } from './validator';

export type Bindings = { DB: D1Database };

export const saveVenueRoute = new Hono<{ Bindings: Bindings }>();

saveVenueRoute.post(
  '/venues',
  tbValidator('json', saveVenueSchema, (result, c) => {
    if (!result.success) return c.json({ success: false, error: 'Validation failed' }, 400);
  }),
  async (c) => {
    if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    return c.json({ success: true, data: await saveVenue(createDb(c.env.DB), c.req.valid('json')) });
  }
);
