import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { listPublicOpenPlay } from './handler';
import { listPublicOpenPlayQuerySchema } from './validator';

export type Bindings = { DB: D1Database };

export const listPublicOpenPlayRoute = new Hono<{ Bindings: Bindings }>();

listPublicOpenPlayRoute.get(
  '/open-play/public',
  tbValidator('query', listPublicOpenPlayQuerySchema, (result, c) => {
    if (!result.success) {
      return c.json({ success: false, error: 'Validation failed: ' + [...result.errors].map((e: any) => `${e.path || e.instancePath?.replace(/^\//, '') || 'field'}: ${e.message}`).join(', ') }, 400);
    }
  }),
  async (c) => {
    if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);

    const { limit, to } = c.req.valid('query');

    return c.json({
      success: true,
      data: await listPublicOpenPlay(createDb(c.env.DB), {
        limit: limit ? Number(limit) : undefined,
        to
      })
    });
  }
);
