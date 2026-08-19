import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { closeSeason, getCloseSeasonChecks, reopenSeason } from './handler';
import { closeSeasonParamSchema } from './validator';

export type Bindings = {
  DB: D1Database;
};

export const closeSeasonRoute = new Hono<{ Bindings: Bindings }>();

// Read-only pre-closure checks endpoint
closeSeasonRoute.get(
  '/:id/close-checks',
  tbValidator('param', closeSeasonParamSchema, (result, c) => {
    if (!result.success) {
      return c.json({ success: false, error: 'Validation failed: ' + [...result.errors].map(e => `${(e as any).path || (e as any).instancePath?.replace(/^\//, '') || 'field'}: ${e.message}`).join(', ') }, 400);
    }
  }),
  async (c) => {
    if (!c.env || !c.env.DB) {
      return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    }
    const { id } = c.req.valid('param');
    const db = createDb(c.env.DB);
    try {
      const data = await getCloseSeasonChecks(db, id);
      return c.json({ success: true, data });
    } catch (err: unknown) {
      return c.json({ success: false, error: (err as Error).message }, 400);
    }
  }
);

// Perform season closure
closeSeasonRoute.post(
  '/:id/close',
  tbValidator('param', closeSeasonParamSchema, (result, c) => {
    if (!result.success) {
      return c.json({ success: false, error: 'Validation failed: ' + [...result.errors].map(e => `${(e as any).path || (e as any).instancePath?.replace(/^\//, '') || 'field'}: ${e.message}`).join(', ') }, 400);
    }
  }),
  async (c) => {
    if (!c.env || !c.env.DB) {
      return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    }
    const { id } = c.req.valid('param');
    let body: any = {};
    try {
      body = await c.req.json();
    } catch {
      // Empty body is allowed
    }
    const db = createDb(c.env.DB);
    try {
      const data = await closeSeason(db, {
        seasonId: id,
        confirmOverwriteInitialBalances: body.confirmOverwriteInitialBalances,
        copyBudgetsToNextSeason: body.copyBudgetsToNextSeason
      });
      return c.json({ success: true, data });
    } catch (err: unknown) {
      return c.json({ success: false, error: (err as Error).message }, 400);
    }
  }
);

// Reopen a closed season
closeSeasonRoute.post(
  '/:id/reopen',
  tbValidator('param', closeSeasonParamSchema, (result, c) => {
    if (!result.success) {
      return c.json({ success: false, error: 'Validation failed: ' + [...result.errors].map(e => `${(e as any).path || (e as any).instancePath?.replace(/^\//, '') || 'field'}: ${e.message}`).join(', ') }, 400);
    }
  }),
  async (c) => {
    if (!c.env || !c.env.DB) {
      return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    }
    const { id } = c.req.valid('param');
    let body: any = {};
    try {
      body = await c.req.json();
    } catch {
      // Empty body is allowed
    }
    const db = createDb(c.env.DB);
    try {
      const data = await reopenSeason(db, {
        seasonId: id,
        reason: body.reason
      });
      return c.json({ success: true, data });
    } catch (err: unknown) {
      return c.json({ success: false, error: (err as Error).message }, 400);
    }
  }
);
