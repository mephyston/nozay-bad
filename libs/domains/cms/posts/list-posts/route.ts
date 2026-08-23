import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { listPosts } from './handler';
import { listPostsQuerySchema } from './validator';

export type Bindings = { DB: D1Database };

export const listPostsRoute = new Hono<{ Bindings: Bindings }>();

listPostsRoute.get(
  '/posts',
  tbValidator('query', listPostsQuerySchema, (result, c) => {
    if (!result.success) {
      return c.json({ success: false, error: 'Validation failed: ' + [...result.errors].map(e => `${(e as any).path || 'field'}: ${e.message}`).join(', ') }, 400);
    }
  }),
  async (c) => {
    if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    const { status, category, limit, offset } = c.req.valid('query');
    const db = createDb(c.env.DB);

    const caller = c.req.header('x-caller');

    // Hors administration, seuls les articles publiés sortent : la contrainte vit ici
    // pour qu'un oubli de paramètre côté appelant ne divulgue pas un brouillon.
    const effectiveStatus = caller === 'admin' ? status : 'published';

    /*
      Cloisonnement public / adhérents, par liste blanche.

      Seuls l'administration et l'espace adhérent voient les actualités réservées.
      **Tout le reste** — le site public, un appelant inconnu, un en-tête absent — est
      ramené au public. L'inverse (exclure explicitement `website`) ferait fuiter les
      actualités réservées au premier appelant qu'on oublierait d'énumérer.
    */
    const seesPrivate = caller === 'admin' || caller === 'storefront';

    return c.json({
      success: true,
      data: await listPosts(db, {
        status: effectiveStatus,
        visibility: seesPrivate ? undefined : 'public',
        categorySlug: category,
        /*
          Décidé d'après l'appelant, comme le cloisonnement ci-dessus, et non demandé
          par le client.

          Seul l'espace adhérent rend le corps des articles depuis cette liste : le site
          public passe par `/cms/route` pour ses articles et n'en tire ici qu'un extrait
          textuel, et l'administration a besoin du texte brut pour l'éditer.
        */
        withBodyMedia: caller === 'storefront',
        limit: limit ? Number(limit) : undefined,
        offset: offset ? Number(offset) : undefined
      })
    });
  }
);
