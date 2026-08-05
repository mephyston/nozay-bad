import { Hono } from 'hono';
import { tbValidator } from '@hono/typebox-validator';
import { Type } from '@sinclair/typebox';
import { createDb } from '@nba/db';
import { getHouseholdEmailsForActiveSeason } from '@nba/members-api';
import { enqueueNotification, type NotificationTarget } from '@nba/notifications-api';

/**
 * Émission des notifications.
 *
 * Cette route vit dans l'app et non dans le contexte `notifications` parce qu'elle
 * croise deux domaines : le ciblage « cotisation non soldée » se résout côté
 * adhérents. Garder le domaine notifications sans dépendance évite le cycle
 * members → accounting → expenses → notifications.
 */

export type NotificationsBindings = {
  DB: D1Database;
};

/**
 * Longueurs bornées : la charge utile chiffrée doit tenir dans les 4 Ko garantis
 * par les services de push.
 */
const sendMessageSchema = Type.Object({
  title: Type.String({ minLength: 1, maxLength: 80 }),
  body: Type.String({ minLength: 1, maxLength: 300 }),
  // Chemin relatif uniquement : une notification ne doit pas ouvrir un site tiers.
  url: Type.Optional(Type.String({ maxLength: 300, pattern: '^/' })),
  target: Type.Union([Type.Literal('all'), Type.Literal('unpaid')])
});

export const notificationsSendRouter = new Hono<{ Bindings: NotificationsBindings }>();

notificationsSendRouter.post(
  '/messages',
  tbValidator('json', sendMessageSchema, (result, c) => {
    if (!result.success) {
      return c.json({ success: false, error: 'Notification invalide.' }, 400);
    }
  }),
  async (c) => {
    if (!c.env?.DB) {
      return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    }
    const { title, body, url, target } = c.req.valid('json');
    const db = createDb(c.env.DB);

    const resolved: NotificationTarget =
      target === 'unpaid'
        ? { kind: 'emails', emails: await getHouseholdEmailsForActiveSeason(db, { unpaidOnly: true }) }
        : { kind: 'all' };

    const result = await enqueueNotification(db, {
      title,
      body,
      url,
      target: resolved,
      // L'historique conserve l'intention (« non soldés ») et non sa résolution.
      targetLabel: target
    });

    return c.json({ success: true, data: result });
  }
);
