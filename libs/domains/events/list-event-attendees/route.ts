import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { listEventAttendees } from './handler';
import { listEventAttendeesParamSchema } from './validator';

export type Bindings = { DB: D1Database };

export const listEventAttendeesRoute = new Hono<{ Bindings: Bindings }>();

listEventAttendeesRoute.get(
  '/:id/attendees',
  tbValidator('param', listEventAttendeesParamSchema, (result, c) => {
    if (!result.success) {
      return c.json({ success: false, error: 'Validation failed: ' + [...result.errors].map((e: any) => `${e.path || e.instancePath?.replace(/^\//, '') || 'field'}: ${e.message}`).join(', ') }, 400);
    }
  }),
  async (c) => {
    if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);

    return c.json({
      success: true,
      data: await listEventAttendees(createDb(c.env.DB), { eventId: Number(c.req.valid('param').id) })
    });
  }
);
