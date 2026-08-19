import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { listScheduleSlots } from './handler';
import { listScheduleSlotsQuerySchema } from './validator';

export type Bindings = { DB: D1Database };

export const listScheduleSlotsRoute = new Hono<{ Bindings: Bindings }>();

listScheduleSlotsRoute.get(
  '/',
  tbValidator('query', listScheduleSlotsQuerySchema, (result, c) => {
    if (!result.success) return c.json({ success: false, error: 'Validation failed' }, 400);
  }),
  async (c) => {
    if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    const { season, audiences, venue } = c.req.valid('query');
    const db = createDb(c.env.DB);

    // Le site public ne voit que les créneaux actifs : un créneau désactivé l'est
    // précisément pour ne plus s'afficher.
    const includeInactive = c.req.header('x-caller') === 'admin';

    return c.json({
      success: true,
      data: await listScheduleSlots(db, {
        seasonCode: season,
        audiences: audiences ? audiences.split(',').map((a) => a.trim()).filter(Boolean) : undefined,
        venueId: venue ? Number(venue) : undefined,
        includeInactive
      })
    });
  }
);
