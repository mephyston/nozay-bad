import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import {
  listSeasons,
  createSeason,
  updateSeason,
  closeSeason,
  getSeasonBudget,
  updateSeasonBudget,
  getSeasonBalance,
  getSeasonBalances,
  updateSeasonBalances,
  getSeasonReports
} from '../../../seasons/handler';
import type { Bindings } from '../routes';

export const seasonsRouter = new Hono<{ Bindings: Bindings }>();

seasonsRouter.get('/', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const db = drizzle(c.env.DB);
  const data = await listSeasons(db);
  return c.json({ success: true, data });
});

seasonsRouter.post('/', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  try {
    const data = await createSeason(db, body);
    return c.json({ success: true, data });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 400);
  }
});

seasonsRouter.put('/:id', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const id = c.req.param('id');
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  try {
    const data = await updateSeason(db, id, body);
    return c.json({ success: true, data });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 400);
  }
});

seasonsRouter.post('/:id/close', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);
  try {
    const data = await closeSeason(db, id);
    return c.json({ success: true, data });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 400);
  }
});

seasonsRouter.get('/:seasonId/budget', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const seasonId = c.req.param('seasonId');
  const db = drizzle(c.env.DB);
  try {
    const data = await getSeasonBudget(db, seasonId);
    return c.json({ success: true, data });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

seasonsRouter.post('/:seasonId/budget', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const seasonId = c.req.param('seasonId');
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  try {
    const data = await updateSeasonBudget(db, seasonId, body);
    return c.json({ success: true, data });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 400);
  }
});

seasonsRouter.get('/:seasonId/balance', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const seasonId = c.req.param('seasonId');
  const db = drizzle(c.env.DB);
  const data = await getSeasonBalance(db, seasonId);
  return c.json({ success: true, data });
});

seasonsRouter.get('/:seasonId/balances', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const seasonId = c.req.param('seasonId');
  const db = drizzle(c.env.DB);
  const data = await getSeasonBalances(db, seasonId);
  return c.json({ success: true, data });
});

seasonsRouter.post('/:seasonId/balances', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const seasonId = c.req.param('seasonId');
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  await updateSeasonBalances(db, seasonId, body);
  return c.json({ success: true });
});

seasonsRouter.get('/:seasonId/reports', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const seasonId = c.req.param('seasonId');
  const db = drizzle(c.env.DB);
  const data = await getSeasonReports(db, seasonId);
  return c.json({ success: true, data });
});
