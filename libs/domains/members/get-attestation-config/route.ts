import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { getAttestationConfig } from './handler';

export type Bindings = {
  DB: D1Database;
};

export const getAttestationConfigRoute = new Hono<{ Bindings: Bindings }>();

// Deux segments pour ne pas être capturé par la route `/:licence` (get-member-by-licence).
getAttestationConfigRoute.get('/attestation/config', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const db = createDb(c.env.DB);
  const data = await getAttestationConfig(db);
  return c.json({ success: true, data });
});
