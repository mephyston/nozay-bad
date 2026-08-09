import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { listEvents } from './handler';
import { listEventsQuerySchema } from './validator';

export type Bindings = { DB: D1Database };

export const listEventsRoute = new Hono<{ Bindings: Bindings }>();

listEventsRoute.get(
  '/',
  tbValidator('query', listEventsQuerySchema, (result, c) => {
    if (!result.success) return c.json({ success: false, error: 'Validation failed' }, 400);
  }),
  async (c) => {
    if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    const { past, limit } = c.req.valid('query');
    const db = createDb(c.env.DB);

    // Brouillons et événements annulés restent à l'administration.
    const includeUnpublished = c.req.header('x-caller') === 'admin';

    return c.json({
      success: true,
      data: await listEvents(db, {
        includePast: past === '1',
        includeUnpublished,
        limit: limit ? Number(limit) : undefined
      })
    });
  }
);
