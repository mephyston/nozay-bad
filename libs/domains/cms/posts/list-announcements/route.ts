import { Hono } from 'hono';
import { Type } from '@sinclair/typebox';
import { tbValidator } from '@hono/typebox-validator';
import { createDb } from '@nba/db';
import { listAnnouncements } from './handler';

export type Bindings = { DB: D1Database };

export const listAnnouncementsQuerySchema = Type.Object({
  limit: Type.Optional(Type.String({ pattern: '^[0-9]{1,3}$' }))
});

export const listAnnouncementsRoute = new Hono<{ Bindings: Bindings }>();

/**
 * Doit être montée **avant** `/posts/:id`, qui l'avalerait sinon.
 */
listAnnouncementsRoute.get(
  '/posts/announcements',
  tbValidator('query', listAnnouncementsQuerySchema, (result, c) => {
    if (!result.success) return c.json({ success: false, error: 'Validation failed' }, 400);
  }),
  async (c) => {
    if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    const { limit } = c.req.valid('query');

    /*
     * Même cloisonnement que la liste complète, et pour la même raison : c'est la route
     * qui le décide, jamais l'appelant. Un article réservé aux adhérents ne doit pas
     * révéler son titre au site public par le détour d'un index d'annonces.
     */
    const caller = c.req.header('x-caller');
    const voitLesReservees = caller === 'admin' || caller === 'storefront';

    return c.json({
      success: true,
      data: await listAnnouncements(createDb(c.env.DB), {
        visibility: voitLesReservees ? undefined : 'public',
        limit: limit ? Number(limit) : undefined
      })
    });
  }
);
