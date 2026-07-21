import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { tbValidator } from '@hono/typebox-validator';
import { createSeason } from './handler';
import { createSeasonSchema } from './validator';

export type Bindings = {
  DB: D1Database;
};

export const createSeasonRoute = new Hono<{ Bindings: Bindings }>();

createSeasonRoute.post(
  '/',
  tbValidator('json', createSeasonSchema, (result, c) => {
    if (!result.success) {
      return c.json({ success: false, error: 'Validation failed: ' + [...result.errors].map(e => `${e.instancePath?.replace(/^\//, '') || 'field'}: ${e.message}`).join(', ') }, 400);
    }
  }),
  async (c) => {
    if (!c.env || !c.env.DB) {
      return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    }
    const body = c.req.valid('json');
    const db = drizzle(c.env.DB);
    try {
      const data = await createSeason(db, body);
      return c.json({ success: true, data });
    } catch (err: any) {
      return c.json({ success: false, error: err.message }, 400);
    }
  }
);

