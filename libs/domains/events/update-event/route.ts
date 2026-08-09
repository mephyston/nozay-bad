import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { updateEvent } from './handler';
import { updateEventSchema } from './validator';

export type Bindings = { DB: D1Database };

export const updateEventRoute = new Hono<{ Bindings: Bindings }>();

updateEventRoute.put(
  '/:id',
  tbValidator('json', updateEventSchema, (result, c) => {
    if (!result.success) return c.json({ success: false, error: 'Validation failed' }, 400);
  }),
  async (c) => {
    if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    const eventId = Number(c.req.param('id'));
    if (!Number.isSafeInteger(eventId) || eventId < 1) {
      return c.json({ success: false, error: "Identifiant d'événement invalide" }, 400);
    }
    return c.json({
      success: true,
      data: await updateEvent(createDb(c.env.DB), { eventId, ...c.req.valid('json') })
    });
  }
);
