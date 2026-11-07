import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { readSettings, saveSettings } from './handler';
import { saveSettingsSchema } from './validator';
import { refuseInvalid } from '../shared/validation';

export const manageSettingsRoute = new Hono<{ Bindings: { DB: D1Database } }>();

manageSettingsRoute.get('/settings', async (c) => {
  return c.json({ success: true, data: await readSettings(createDb(c.env.DB)) });
});

manageSettingsRoute.put('/settings', tbValidator('json', saveSettingsSchema, refuseInvalid), async (c) => {
  return c.json({ success: true, data: await saveSettings(createDb(c.env.DB), c.req.valid('json')) });
});
