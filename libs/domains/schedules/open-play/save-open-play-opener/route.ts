import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { saveOpenPlayOpener } from './handler';
import { saveOpenPlayOpenerSchema } from './validator';

export type Bindings = { DB: D1Database };

export const saveOpenPlayOpenerRoute = new Hono<{ Bindings: Bindings }>();

saveOpenPlayOpenerRoute.post(
  '/open-play/openers',
  tbValidator('json', saveOpenPlayOpenerSchema, (result, c) => {
    if (!result.success) return c.json({ success: false, error: 'Validation failed' }, 400);
  }),
  async (c) => {
    if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    return c.json({
      success: true,
      data: await saveOpenPlayOpener(createDb(c.env.DB), c.req.valid('json'))
    });
  }
);
