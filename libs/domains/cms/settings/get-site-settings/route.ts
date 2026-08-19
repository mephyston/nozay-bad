import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { getSiteSettings } from './handler';

export type Bindings = {
  DB: D1Database;
};

export const getSiteSettingsRoute = new Hono<{ Bindings: Bindings }>();

/**
 * Lecture ouverte au Worker du site (`service` dans la table d'autorisation) : il n'a
 * ni identité ni permission, et ces réglages sont affichés à tous les visiteurs.
 */
getSiteSettingsRoute.get('/settings', async (c) => {
  if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  const db = createDb(c.env.DB);
  return c.json({ success: true, data: await getSiteSettings(db) });
});
