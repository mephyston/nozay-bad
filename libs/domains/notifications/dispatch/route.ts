import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { dispatchPendingNotifications } from './handler';
import { resolveVapid, type VapidEnv } from '../shared/vapid';

export type Bindings = {
  DB: D1Database;
} & VapidEnv;

export const dispatchRoute = new Hono<{ Bindings: Bindings }>();

/**
 * Déclenchement manuel du drain, utilisé par l'admin juste après un envoi pour ne
 * pas attendre le prochain passage du cron.
 */
dispatchRoute.post('/dispatch', async (c) => {
  if (!c.env?.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }

  const vapid = resolveVapid(c.env);
  if (!vapid) {
    // Fail-closed : sans clés VAPID, tous les envois seraient rejetés par le
    // service de push. Mieux vaut une erreur de configuration explicite.
    return c.json({ success: false, error: 'Clés VAPID non configurées.' }, 500);
  }

  const db = createDb(c.env.DB);
  const result = await dispatchPendingNotifications(db, vapid);
  return c.json({ success: true, data: result });
});
