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

    // Hors administration, seuls les articles publiés sortent : la contrainte vit ici
    // pour qu'un oubli de paramètre côté appelant ne divulgue pas un brouillon.
    const effectiveStatus = c.req.header('x-caller') === 'admin' ? status : 'published';

    return c.json({
      success: true,
      data: await listPosts(db, {
        status: effectiveStatus,
        categorySlug: category,
        limit: limit ? Number(limit) : undefined,
        offset: offset ? Number(offset) : undefined
      })
    });
  }
);
