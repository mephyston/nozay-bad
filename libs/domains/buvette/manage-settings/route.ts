import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { readCardPayments, readSettings, saveSettings, setCardPayments } from './handler';
import { cardPaymentsSchema, saveSettingsSchema } from './validator';
import { refuseInvalid } from '../shared/validation';

export const manageSettingsRoute = new Hono<{ Bindings: { DB: D1Database } }>();

manageSettingsRoute.get('/settings', async (c) => {
  return c.json({ success: true, data: await readSettings(createDb(c.env.DB)) });
});

manageSettingsRoute.put('/settings', tbValidator('json', saveSettingsSchema, refuseInvalid), async (c) => {
  return c.json({ success: true, data: await saveSettings(createDb(c.env.DB), c.req.valid('json')) });
});

manageSettingsRoute.put('/settings/card-payments', tbValidator('json', cardPaymentsSchema, refuseInvalid), async (c) => {
  return c.json({ success: true, data: await setCardPayments(createDb(c.env.DB), c.req.valid('json').enabled) });
});

manageSettingsRoute.get('/settings/card-payments', async (c) => {
  return c.json({ success: true, data: await readCardPayments(createDb(c.env.DB)) });
});
