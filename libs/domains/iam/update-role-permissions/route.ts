import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { updateRolePermissions } from './handler';
import { updateRolePermissionsBodySchema } from './validator';

export type Bindings = {
  DB: D1Database;
};

export const updateRolePermissionsRoute = new Hono<{ Bindings: Bindings }>();

updateRolePermissionsRoute.put(
  '/roles/:role',
  tbValidator('json', updateRolePermissionsBodySchema, (result, c) => {
    if (!result.success) {
      return c.json({ success: false, error: 'Droits invalides : permission inconnue.' }, 400);
    }
  }),
  async (c) => {
    if (!c.env?.DB) {
      return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    }

    // L'auteur vient de l'identité affirmée par l'appelant, la même que celle sur
    // laquelle l'autorisation a été décidée : le journal ne peut pas mentir sur qui
    // a agi sans que la requête ait été refusée en amont.
    const actorEmail = c.req.header('x-user-email') || '';
    if (!actorEmail) {
      return c.json({ success: false, error: 'Identité appelante absente' }, 400);
    }

    const { permissions } = c.req.valid('json');
    const db = createDb(c.env.DB);
    const updated = await updateRolePermissions(db, c.req.param('role'), permissions, actorEmail);
    return c.json({ success: true, data: updated });
  }
);
