import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { updateAnnouncement } from './handler';
import { updateAnnouncementSchema } from './validator';

export type Bindings = {
  DB: D1Database;
};

export const updateAnnouncementRoute = new Hono<{ Bindings: Bindings }>();

updateAnnouncementRoute.put(
  '/:id',
  tbValidator('json', updateAnnouncementSchema, (result, c) => {
    if (!result.success) {
      return c.json({ success: false, error: 'Validation failed: ' + [...result.errors].map(e => `${(e as any).path || (e as any).instancePath?.replace(/^\//, '') || 'field'}: ${e.message}`).join(', ') }, 400);
    }
  }),
  async (c) => {
    if (!c.env || !c.env.DB) {
      return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    }
    const id = parseInt(c.req.param('id'));
    if (isNaN(id)) {
      return c.json({ success: false, error: 'Identifiant invalide' }, 400);
    }
    const body = c.req.valid('json');
    const db = createDb(c.env.DB);

    const announcement = await updateAnnouncement(db, id, body);
    return c.json({ success: true, data: announcement });
  }
);
