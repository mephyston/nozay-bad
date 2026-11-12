import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { getFeeBreakdown } from './handler';
import { getFeeBreakdownQuerySchema } from './validator';
import type { CountMembers } from './dto';

export type Bindings = { DB: D1Database };

export interface FeeBreakdownRouteDeps {
  /** L'effectif vit chez les adhérents : c'est l'API qui le fournit. */
  countMembers: (db: D1Database) => CountMembers;
  withDetails: boolean;
}

/** GET /fee-breakdown?seasonId=AA-BB : monté deux fois, pour le bureau et pour l'espace adhérent. */
export const createGetFeeBreakdownRoute = (deps: FeeBreakdownRouteDeps) => {
  const route = new Hono<{ Bindings: Bindings }>();
  route.get(
    '/fee-breakdown',
    tbValidator('query', getFeeBreakdownQuerySchema, (result, c) => {
      if (!result.success) return c.json({ success: false, error: 'Saison invalide' }, 400);
    }),
    async (c) => {
      if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
      const { seasonId } = c.req.valid('query');
      const data = await getFeeBreakdown(createDb(c.env.DB), {
        seasonCode: seasonId,
        countMembers: deps.countMembers(c.env.DB),
        withDetails: deps.withDetails
      });
      return c.json({ success: true, data });
    }
  );
  return route;
};
