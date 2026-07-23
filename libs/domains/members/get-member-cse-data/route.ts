import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { getMemberCseData } from './handler';
import { getMemberCseDataParamSchema } from './validator';

export type Bindings = {
  DB: D1Database;
};

export const getMemberCseDataRoute = new Hono<{ Bindings: Bindings }>();

getMemberCseDataRoute.get(
  '/:id/cse-data',
  tbValidator('param', getMemberCseDataParamSchema, (result, c) => {
    if (!result.success) {
      return c.json({ success: false, error: 'Identifiant invalide' }, 400);
    }
  }),
  async (c) => {
    if (!c.env || !c.env.DB) {
      return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    }
    const { id: idStr } = c.req.valid('param');
    const id = parseInt(idStr, 10);
    const db = createDb(c.env.DB);
    const data = await getMemberCseData(db, id);

    return c.json({
      success: true,
      data
    });
  }
);
