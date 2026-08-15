import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { saveSiteSettings } from './handler';
import { saveSiteSettingsSchema } from './validator';

export type Bindings = {
  DB: D1Database;
};

export const saveSiteSettingsRoute = new Hono<{ Bindings: Bindings }>();

saveSiteSettingsRoute.put(
  '/settings',
  tbValidator('json', saveSiteSettingsSchema, (result, c) => {
    if (!result.success) return c.json({ success: false, error: 'Validation failed' }, 400);
  }),
  async (c) => {
    if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    const db = createDb(c.env.DB);
    const actorEmail = c.req.header('x-user-email') || '';
    return c.json({
      success: true,
      data: await saveSiteSettings(db, { ...c.req.valid('json'), actorEmail })
    });
  }
);
