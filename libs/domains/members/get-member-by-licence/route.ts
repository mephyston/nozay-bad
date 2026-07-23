import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { getMemberByLicence } from './handler';
import { getMemberByLicenceParamSchema, getMemberByLicenceQuerySchema } from './validator';

export type Bindings = {
  DB: D1Database;
};

export const getMemberByLicenceRoute = new Hono<{ Bindings: Bindings }>();

getMemberByLicenceRoute.get(
  '/:licence',
  tbValidator('param', getMemberByLicenceParamSchema, (result, c) => {
    if (!result.success) {
      return c.json({ success: false, error: 'Validation failed: ' + [...result.errors].map(e => `${(e as any).path || (e as any).instancePath?.replace(/^\//, '') || 'field'}: ${e.message}`).join(', ') }, 400);
    }
  }),
  tbValidator('query', getMemberByLicenceQuerySchema, (result, c) => {
    if (!result.success) {
      return c.json({ success: false, error: 'Validation failed: ' + [...result.errors].map(e => `${(e as any).path || (e as any).instancePath?.replace(/^\//, '') || 'field'}: ${e.message}`).join(', ') }, 400);
    }
  }),
  async (c) => {
    if (!c.env || !c.env.DB) {
      return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    }

    const { licence } = c.req.valid('param');
    const { season = '' } = c.req.valid('query');
    const db = createDb(c.env.DB);

    const member = await getMemberByLicence(db, licence, season);

    return c.json({
      success: true,
      data: member,
    });
  }
);
