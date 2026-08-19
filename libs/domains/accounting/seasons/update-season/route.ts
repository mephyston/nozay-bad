import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { updateSeason } from './handler';
import { updateSeasonSchema } from './validator';

export type Bindings = {
  DB: D1Database;
};

export const updateSeasonRoute = new Hono<{ Bindings: Bindings }>();

updateSeasonRoute.put(
  '/:id',
  tbValidator('json', updateSeasonSchema, (result, c) => {
    if (!result.success) {
      return c.json({ success: false, error: 'Validation failed: ' + [...result.errors].map(e => `${(e as any).path || (e as any).instancePath?.replace(/^\//, '') || 'field'}: ${e.message}`).join(', ') }, 400);
    }
  }),
  async (c) => {
    if (!c.env || !c.env.DB) {
      return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    }
    const id = c.req.param('id');
    const body = c.req.valid('json');
    const db = createDb(c.env.DB);
    try {
      const data = await updateSeason(db, id, body);
      return c.json({ success: true, data });
    } catch (err: any) {
      return c.json({ success: false, error: err.message }, 400);
    }
  }
);
