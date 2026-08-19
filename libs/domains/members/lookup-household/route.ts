import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { lookupHousehold } from './handler';
import { lookupHouseholdBodySchema } from './validator';

export type Bindings = {
  DB: D1Database;
};

export const lookupHouseholdRoute = new Hono<{ Bindings: Bindings }>();

// Route LITTÉRALE : doit être montée avant `getMemberByLicenceRoute` (`GET /:licence`)
// dans index.ts, sinon `/lookup-household` serait capturé par le paramètre.
// Appelée uniquement par le BFF storefront (secret INTERNAL_API_KEY) pour l'auth OTP.
lookupHouseholdRoute.post(
  '/lookup-household',
  tbValidator('json', lookupHouseholdBodySchema, (result, c) => {
    if (!result.success) {
      return c.json({ success: false, error: 'Validation failed: identifier is required' }, 400);
    }
  }),
  async (c) => {
    if (!c.env || !c.env.DB) {
      return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    }

    const { identifier } = c.req.valid('json');
    const db = createDb(c.env.DB);
    const result = await lookupHousehold(db, identifier);

    return c.json({ success: true, data: result });
  }
);
