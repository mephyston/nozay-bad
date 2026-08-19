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

    // Qui voit les brouillons.
    //
    // L'administration, toujours. Le site public seulement s'il affirme avoir vérifié
    // un jeton d'aperçu — la vérification cryptographique vit dans le Worker du site,
    // parce qu'un domaine métier ne dépend pas de l'authentification. La confiance
    // repose ici sur la même base que `x-user-email` côté admin : la clé interne, que
    // seuls les Workers détiennent.
    const caller = c.req.header('x-caller');
    const includeDrafts =
      caller === 'admin' || (caller === 'website' && c.req.header('x-preview-verified') === '1');

    // Même liste blanche que la liste des actualités : seuls l'administration et
    // l'espace adhérent atteignent une actualité réservée par son adresse.
    const includePrivate = caller === 'admin' || caller === 'storefront';

    const resolved = await resolveRoute(db, { path, includeDrafts, includePrivate });
    return c.json({ success: true, data: resolved });
  }
);
