import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { generateOpenPlaySessions } from './handler';
import { generateOpenPlaySessionsSchema } from './validator';

export type Bindings = { DB: D1Database };

export const generateOpenPlaySessionsRoute = new Hono<{ Bindings: Bindings }>();

generateOpenPlaySessionsRoute.post(
  '/open-play/generate',
  tbValidator('json', generateOpenPlaySessionsSchema, (result, c) => {
    if (!result.success) return c.json({ success: false, error: 'Validation failed' }, 400);
  }),
  async (c) => {
    if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    return c.json({
      success: true,
      data: await generateOpenPlaySessions(createDb(c.env.DB), c.req.valid('json'))
    });
  }
);
