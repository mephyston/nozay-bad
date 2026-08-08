import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { createAnnouncement } from './handler';
import { createAnnouncementSchema } from './validator';

export type Bindings = {
  DB: D1Database;
};

export const createAnnouncementRoute = new Hono<{ Bindings: Bindings }>();

createAnnouncementRoute.post(
  '/',
  tbValidator('json', createAnnouncementSchema, (result, c) => {
    if (!result.success) {
      return c.json({ success: false, error: 'Validation failed: ' + [...result.errors].map(e => `${(e as any).path || (e as any).instancePath?.replace(/^\//, '') || 'field'}: ${e.message}`).join(', ') }, 400);
    }
  }),
  async (c) => {
    if (!c.env || !c.env.DB) {
      return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    }
    const body = c.req.valid('json');
    const db = createDb(c.env.DB);

    // Identité déjà vérifiée par le middleware d'autorisation : elle n'est là qu'à
    // titre d'information sur la fiche, elle ne gouverne aucun droit.
    const authorEmail = c.req.header('x-user-email') || '';

    const announcement = await createAnnouncement(db, body, authorEmail);
    return c.json({ success: true, data: announcement });
  }
);
