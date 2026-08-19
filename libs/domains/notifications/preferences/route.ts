import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { getPreferences, updatePreferences } from './handler';
import { getPreferencesQuerySchema, updatePreferencesBodySchema } from './validator';

export type Bindings = {
  DB: D1Database;
};

export const preferencesRoute = new Hono<{ Bindings: Bindings }>();

preferencesRoute.get(
  '/preferences',
  tbValidator('query', getPreferencesQuerySchema, (result, c) => {
    if (!result.success) {
      return c.json({ success: false, error: 'Compte adhérent invalide.' }, 400);
    }
  }),
  async (c) => {
    if (!c.env?.DB) {
      return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    }
    const { email } = c.req.valid('query');
    const db = createDb(c.env.DB);
    return c.json({ success: true, data: await getPreferences(db, email) });
  }
);

preferencesRoute.put(
  '/preferences',
  tbValidator('json', updatePreferencesBodySchema, (result, c) => {
    if (!result.success) {
      return c.json({ success: false, error: 'Réglages invalides.' }, 400);
    }
  }),
  async (c) => {
    if (!c.env?.DB) {
      return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    }
    const { email, disabled } = c.req.valid('json');
    const db = createDb(c.env.DB);
    return c.json({ success: true, data: await updatePreferences(db, { email, disabled }) });
  }
);
