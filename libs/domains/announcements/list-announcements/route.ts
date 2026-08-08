import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { listAnnouncements } from './handler';
import { listAnnouncementsQuerySchema } from './validator';

export type Bindings = {
  DB: D1Database;
};

export const listAnnouncementsRoute = new Hono<{ Bindings: Bindings }>();

listAnnouncementsRoute.get(
  '/',
  tbValidator('query', listAnnouncementsQuerySchema, (result, c) => {
    if (!result.success) {
      return c.json({ success: false, error: 'Validation failed: ' + [...result.errors].map(e => `${(e as any).path || (e as any).instancePath?.replace(/^\//, '') || 'field'}: ${e.message}`).join(', ') }, 400);
    }
  }),
  async (c) => {
    if (!c.env || !c.env.DB) {
      return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    }
    const { status, limit, offset } = c.req.valid('query');
    const db = createDb(c.env.DB);

    // Le storefront atteint cette route en tant que service, sans identité ni
    // permission : il ne doit jamais voir un brouillon, même en le demandant
    // explicitement. La contrainte est posée ici plutôt que côté appelant, pour que
    // l'oubli d'un `?status=published` ne divulgue rien.
    const isStorefront = c.req.header('x-caller') === 'storefront';
    const effectiveStatus = isStorefront ? 'published' : status;

    const announcements = await listAnnouncements(db, {
      status: effectiveStatus,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined
    });
    return c.json({ success: true, data: announcements });
  }
);
