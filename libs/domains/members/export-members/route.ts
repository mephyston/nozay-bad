import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { exportMembersEmails } from './handler';
import { exportMembersQuerySchema } from './validator';

export type Bindings = {
  DB: D1Database;
};

export const exportMembersRoute = new Hono<{ Bindings: Bindings }>();

exportMembersRoute.get(
  '/export',
  tbValidator('query', exportMembersQuerySchema, (result, c) => {
    if (!result.success) {
      return c.json({ success: false, error: 'Validation failed' }, 400);
    }
  }),
  async (c) => {
    if (!c.env || !c.env.DB) {
      return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    }
    const query = c.req.valid('query');
    const db = createDb(c.env.DB);
    const fichier = await exportMembersEmails(db, {
      search: query.search || undefined,
      gender: (query.gender as 'M' | 'F') || undefined,
      type: query.type || undefined,
      status: query.status || undefined,
      season: query.season || undefined
    });
    return new Response(fichier.data as unknown as BodyInit, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fichier.filename}"`,
        'Cache-Control': 'no-cache'
      }
    });
  }
);
