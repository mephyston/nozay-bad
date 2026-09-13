import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { Value } from '@sinclair/typebox/value';
import { updateClubSettings } from './handler';
import { SECTION_SCHEMAS } from './validator';
import { isSettingsSection } from '../shared/settings';

export type Bindings = { DB: D1Database };

export const updateClubSettingsRoute = new Hono<{ Bindings: Bindings }>();

/**
 * Une écriture par section (`PUT /club/settings/bank`, …).
 *
 * Le schéma est choisi d'après le segment d'URL, ce que `tbValidator` — lié à un
 * schéma fixe — ne sait pas faire : la validation est donc explicite. Une section
 * inconnue est introuvable, pas invalide.
 */
updateClubSettingsRoute.put('/settings/:section', async (c) => {
  if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);

  const section = c.req.param('section');
  if (!isSettingsSection(section)) return c.json({ success: false, error: 'Section inconnue' }, 404);

  const body = await c.req.json().catch(() => null);
  const schema = SECTION_SCHEMAS[section];
  if (body === null || !Value.Check(schema, body)) {
    const first = Value.Errors(schema, body ?? {}).First();
    const detail = first ? ` (${first.path.replace(/^\//, '')})` : '';
    return c.json({ success: false, error: `Données de configuration invalides${detail}` }, 400);
  }

  const db = createDb(c.env.DB);
  const actorEmail = c.req.header('x-user-email') || '';
  const settings = await updateClubSettings(db, section, body as never, actorEmail);
  return c.json({ success: true, data: settings });
});
