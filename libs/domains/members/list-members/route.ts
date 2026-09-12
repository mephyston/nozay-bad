import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { listMembers } from './handler';
import { listMembersQuerySchema } from './validator';

export type Bindings = {
  DB: D1Database;
};

export const listMembersRoute = new Hono<{ Bindings: Bindings }>();

listMembersRoute.get(
  '/',
  tbValidator('query', listMembersQuerySchema, (result, c) => {
    if (!result.success) {
      return c.json({ success: false, error: 'Validation failed: ' + [...result.errors].map(e => `${(e as any).path || (e as any).instancePath?.replace(/^\//, '') || 'field'}: ${e.message}`).join(', ') }, 400);
    }
  }),
  async (c) => {
    if (!c.env || !c.env.DB) {
      return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    }

    const query = c.req.valid('query');
    const page = parseInt(query.page || '1', 10);
    const rawLimit = parseInt(query.limit || '20', 10);
    const limit = Math.min(Math.max(1, rawLimit), 5000);
    const search = query.search || '';
    const gender = query.gender || '';
    const type = query.type || '';
    const status = query.status || '';
    const season = query.season || '';

    const paidParam = query.paid;
    let paid: boolean | undefined = undefined;
    if (paidParam === 'true') {
      paid = true;
    } else if (paidParam === 'false') {
      paid = false;
    }

    const db = createDb(c.env.DB);
    const result = await listMembers(db, { search, gender: gender as any, type, status, season, paid, cohort: query.cohort }, { page, limit });

    return c.json({
      success: true,
      ...result
    });
  }
);
