import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { notifyAnnouncement } from './handler';

export type Bindings = {
  DB: D1Database;
};

export const notifyAnnouncementRoute = new Hono<{ Bindings: Bindings }>();

notifyAnnouncementRoute.post('/:id/notify', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) {
    return c.json({ success: false, error: 'Identifiant invalide' }, 400);
  }
  const db = createDb(c.env.DB);

  const result = await notifyAnnouncement(db, id);
  return c.json({ success: true, data: result });
});
