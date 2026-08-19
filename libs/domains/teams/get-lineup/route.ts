import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { loadLineup } from './handler';

export type Bindings = { DB: D1Database };

export const getLineupRoute = new Hono<{ Bindings: Bindings }>();

getLineupRoute.get('/:id/days/:number/lineup', async (c) => {
  if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);

  const teamId = Number(c.req.param('id'));
  const dayNumber = Number(c.req.param('number'));
  if (!Number.isSafeInteger(teamId) || teamId < 1) {
    return c.json({ success: false, error: "Identifiant d'équipe invalide" }, 400);
  }
  if (!Number.isSafeInteger(dayNumber) || dayNumber < 1) {
    return c.json({ success: false, error: 'Numéro de journée invalide' }, 400);
  }

  return c.json({
    success: true,
    data: await loadLineup(createDb(c.env.DB), {
      teamId,
      dayNumber,
      slot: c.req.query('slot') ? Number(c.req.query('slot')) : undefined,
      // Imposée par l'appelant de confiance : l'espace adhérent la tire de la session.
      viewerLicence: c.req.query('licence') ?? null
    })
  });
});
