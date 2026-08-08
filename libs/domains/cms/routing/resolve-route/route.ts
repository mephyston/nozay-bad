import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { resolveRoute } from './handler';
import { resolveRouteQuerySchema } from './validator';

export type Bindings = {
  DB: D1Database;
};

export const resolveRouteRoute = new Hono<{ Bindings: Bindings }>();

resolveRouteRoute.get(
  '/route',
  tbValidator('query', resolveRouteQuerySchema, (result, c) => {
    if (!result.success) {
      return c.json({ success: false, error: 'Validation failed: ' + [...result.errors].map(e => `${(e as any).path || (e as any).instancePath?.replace(/^\//, '') || 'field'}: ${e.message}`).join(', ') }, 400);
    }
  }),
  async (c) => {
    if (!c.env || !c.env.DB) {
      return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    }
    const { path } = c.req.valid('query');
    const db = createDb(c.env.DB);

    // Seule l'administration voit les brouillons. Le site public atteint cette route
    // en tant que service, sans identité : la contrainte est posée ici plutôt que
    // côté appelant, pour qu'aucun oubli de paramètre ne divulgue un brouillon.
    const includeDrafts = c.req.header('x-caller') === 'admin';

    const resolved = await resolveRoute(db, { path, includeDrafts });
    return c.json({ success: true, data: resolved });
  }
);
