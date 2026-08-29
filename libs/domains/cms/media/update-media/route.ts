import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { updateMedia } from './handler';
import { updateMediaSchema } from './validator';

export type Bindings = { DB: D1Database };

export const updateMediaRoute = new Hono<{ Bindings: Bindings }>();

updateMediaRoute.put(
  '/media/:id',
  tbValidator('json', updateMediaSchema, (result, c) => {
    if (!result.success) {
      return c.json({ success: false, error: 'Validation failed: ' + [...result.errors].map(e => `${(e as any).path || 'field'}: ${e.message}`).join(', ') }, 400);
    }
  }),
  async (c) => {
    if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    const mediaId = Number(c.req.param('id'));
    if (!Number.isSafeInteger(mediaId) || mediaId < 1) {
      return c.json({ success: false, error: 'Identifiant de média invalide' }, 400);
    }
    const db = createDb(c.env.DB);
    return c.json({ success: true, data: await updateMedia(db, { mediaId, ...c.req.valid('json') }) });
  }
);
