import { Hono } from 'hono';
import { tbValidator } from '@hono/typebox-validator';
import { createDb, type Db } from '@nba/db';
import {
  getHouseholdEmailsForActiveSeason,
  getMemberContactsByEmails,
  getMemberGroupsForActiveSeason
} from '@nba/members-api';
import {
  enqueueNotification,
  getNotificationSubscribers,
  sendNotificationSchema,
  type NotificationTarget,
  type NotificationTargetLabel
} from '@nba/notifications-api';

/**
 * Émission des notifications et audiences.
 *
 * Ces routes vivent dans l'app et non dans le contexte `notifications` parce
 * qu'elles croisent deux domaines : les ciblages « cotisation non soldée » et
 * « groupes », ainsi que l'identité des abonnés, se résolvent côté adhérents.
 * Garder le domaine notifications sans dépendance évite le cycle
 * members → accounting → expenses → notifications.
 */

export type NotificationsBindings = {
  DB: D1Database;
};

export const notificationsSendRouter = new Hono<{ Bindings: NotificationsBindings }>();

/** Cibles proposées à l'émetteur : groupes de la saison active et leurs effectifs. */
notificationsSendRouter.get('/audiences', async (c) => {
  if (!c.env?.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const db = createDb(c.env.DB);
  return c.json({ success: true, data: { groups: await getMemberGroupsForActiveSeason(db) } });
});

/**
 * Abonnés, enrichis de l'identité des adhérents joignables à chaque adresse.
 *
 * Un appareil peut couvrir plusieurs dossiers (un parent abonné pour une fratrie) :
 * la réponse liste donc les adhérents rattachés à chaque abonnement.
 */
notificationsSendRouter.get('/subscribers', async (c) => {
  if (!c.env?.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const db = createDb(c.env.DB);

  const subscribers = await getNotificationSubscribers(db);
  const contacts = await getMemberContactsByEmails(db, [...new Set(subscribers.map((s) => s.email))]);

  const byEmail = new Map<string, { name: string; group: string }[]>();
  for (const contact of contacts) {
    const list = byEmail.get(contact.matchedEmail) ?? [];
    list.push({ name: `${contact.firstName} ${contact.lastName}`, group: contact.type });
    byEmail.set(contact.matchedEmail, list);
  }

  return c.json({
    success: true,
    data: subscribers.map((subscriber) => ({
      ...subscriber,
      // Liste vide = adresse sans dossier dans la saison active (adhérent non
      // réinscrit) : l'abonnement reste valide mais n'est plus rattaché.
      members: byEmail.get(subscriber.email) ?? []
    }))
  });
});

async function resolveTarget(
  db: Db,
  target: 'all' | 'unpaid' | 'groups',
  groups: string[]
): Promise<{ resolved: NotificationTarget; label: NotificationTargetLabel; detail: string | null }> {
  if (target === 'unpaid') {
    return {
      resolved: {
        kind: 'emails',
        emails: await getHouseholdEmailsForActiveSeason(db, { unpaidOnly: true })
      },
      label: 'unpaid',
      detail: null
    };
  }

  if (target === 'groups') {
    return {
      resolved: {
        kind: 'emails',
        emails: await getHouseholdEmailsForActiveSeason(db, { types: groups })
      },
      label: 'groups',
      detail: groups.join(', ')
    };
  }

  return { resolved: { kind: 'all' }, label: 'all', detail: null };
}

notificationsSendRouter.post(
  '/messages',
  tbValidator('json', sendNotificationSchema, (result, c) => {
    if (!result.success) {
      return c.json({ success: false, error: 'Notification invalide.' }, 400);
    }
  }),
  async (c) => {
    if (!c.env?.DB) {
      return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    }
    const { title, body, url, target, groups, category } = c.req.valid('json');

    if (target === 'groups' && (!groups || groups.length === 0)) {
      return c.json({ success: false, error: 'Sélectionnez au moins un groupe.' }, 400);
    }

    const db = createDb(c.env.DB);
    const { resolved, label, detail } = await resolveTarget(db, target, groups ?? []);

    const result = await enqueueNotification(db, {
      title,
      body,
      url,
      target: resolved,
      // L'historique conserve l'intention de ciblage, pas sa résolution en emails.
      targetLabel: label,
      targetDetail: detail ?? undefined,
      category: category ?? 'announcement'
    });

    return c.json({ success: true, data: result });
  }
);
