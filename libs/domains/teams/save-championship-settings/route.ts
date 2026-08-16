import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { saveChampionshipSettings } from './handler';
import { saveChampionshipSettingsSchema } from './validator';

export type Bindings = { DB: D1Database };

export const saveChampionshipSettingsRoute = new Hono<{ Bindings: Bindings }>();

saveChampionshipSettingsRoute.put(
  '/championship-settings',
  tbValidator('json', saveChampionshipSettingsSchema, (result, c) => {
    if (!result.success) return c.json({ success: false, error: 'Validation failed' }, 400);
  }),
  async (c) => {
    if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    return c.json({
      success: true,
      data: await saveChampionshipSettings(createDb(c.env.DB), c.req.valid('json'))
    });
  }
);
