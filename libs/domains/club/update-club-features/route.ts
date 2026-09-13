import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { updateClubFeatures } from './handler';
import { updateClubFeaturesSchema } from './validator';

export type Bindings = { DB: D1Database };

export const updateClubFeaturesRoute = new Hono<{ Bindings: Bindings }>();

updateClubFeaturesRoute.put(
  '/features',
  tbValidator('json', updateClubFeaturesSchema, (result, c) => {
    if (!result.success) return c.json({ success: false, error: 'Fonctionnalité inconnue' }, 400);
  }),
  async (c) => {
    if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    const db = createDb(c.env.DB);
    const actorEmail = c.req.header('x-user-email') || '';
    const features = await updateClubFeatures(db, c.req.valid('json'), actorEmail);
    return c.json({ success: true, data: features });
  }
);
