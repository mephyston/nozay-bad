import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { unregisterFromEvent } from './handler';

export type Bindings = { DB: D1Database };

export const unregisterFromEventRoute = new Hono<{ Bindings: Bindings }>();

unregisterFromEventRoute.delete('/:id/registrations', async (c) => {
  if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);

  const eventId = Number(c.req.param('id'));
  if (!Number.isSafeInteger(eventId) || eventId < 1) {
    return c.json({ success: false, error: "Identifiant d'événement invalide" }, 400);
  }

  // L'adhérent voyage en paramètre de requête faute de corps sur un DELETE. Il vient de
  // la session côté espace adhérent : ce n'est pas une donnée que le navigateur choisit.
  const memberId = Number(c.req.query('memberId'));
  if (!Number.isSafeInteger(memberId) || memberId < 1) {
    return c.json({ success: false, error: "Identifiant d'adhérent invalide" }, 400);
  }

  return c.json({
    success: true,
    data: await unregisterFromEvent(createDb(c.env.DB), { eventId, memberId })
  });
});
