import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { saveNavItem } from './handler';
import { saveNavItemSchema } from './validator';

export type Bindings = { DB: D1Database };

export const saveNavItemRoute = new Hono<{ Bindings: Bindings }>();

saveNavItemRoute.post(
  '/nav',
  tbValidator('json', saveNavItemSchema, (result, c) => {
    if (!result.success) return c.json({ success: false, error: 'Validation failed' }, 400);
  }),
  async (c) => {
    if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    const db = createDb(c.env.DB);
    return c.json({ success: true, data: await saveNavItem(db, c.req.valid('json')) });
  }
);

saveNavItemRoute.put(
  '/nav/:id',
  tbValidator('json', saveNavItemSchema, (result, c) => {
    if (!result.success) return c.json({ success: false, error: 'Validation failed' }, 400);
  }),
  async (c) => {
    if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    const navItemId = Number(c.req.param('id'));
    if (!Number.isSafeInteger(navItemId) || navItemId < 1) {
      return c.json({ success: false, error: "Identifiant d'entrée de menu invalide" }, 400);
    }
    const db = createDb(c.env.DB);
    return c.json({ success: true, data: await saveNavItem(db, { navItemId, ...c.req.valid('json') }) });
  }
);
