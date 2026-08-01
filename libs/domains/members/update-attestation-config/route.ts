import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { updateAttestationConfig } from './handler';
import { updateAttestationConfigSchema } from './validator';

export type Bindings = {
  DB: D1Database;
};

export const updateAttestationConfigRoute = new Hono<{ Bindings: Bindings }>();

updateAttestationConfigRoute.put(
  '/attestation/config',
  tbValidator('json', updateAttestationConfigSchema, (result, c) => {
    if (!result.success) {
      return c.json({ success: false, error: 'Données de configuration invalides' }, 400);
    }
  }),
  async (c) => {
    if (!c.env || !c.env.DB) {
      return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    }
    const input = c.req.valid('json');
    const db = createDb(c.env.DB);
    await updateAttestationConfig(db, input);
    return c.json({ success: true });
  }
);
