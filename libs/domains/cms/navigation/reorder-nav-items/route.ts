import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { reorderNavItems } from './handler';
import { reorderNavItemsSchema } from './validator';

export type Bindings = { DB: D1Database };

export const reorderNavItemsRoute = new Hono<{ Bindings: Bindings }>();

// Déclaré avant `/nav/:id` dans le routeur : sans quoi « reorder » serait pris pour un
// identifiant.
reorderNavItemsRoute.put(
  '/nav/reorder',
  tbValidator('json', reorderNavItemsSchema, (result, c) => {
    if (!result.success) return c.json({ success: false, error: 'Validation failed' }, 400);
  }),
  async (c) => {
    if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    const db = createDb(c.env.DB);
    return c.json({ success: true, data: await reorderNavItems(db, c.req.valid('json')) });
  }
);
