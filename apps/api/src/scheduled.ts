import { createDb } from '@nba/db';
import {
  getBirthdaysForActiveSeason,
  getContactEmailsForMembers,
  getHouseholdEmailsForActiveSeason
} from '@nba/members-api';
import { getOrdersAwaitingPaymentSince } from '@nba/shop-api';
import {
  dispatchPendingNotifications,
  enqueueNotification,
  purgeNotificationHistory,
  resolveVapid,
  type VapidEnv
} from '@nba/notifications-api';

export type ScheduledBindings = {
  DB: D1Database;
  /**
   * Rappels automatiques : cotisation non soldée et commande boutique en attente de
   * paiement. Désactivés par défaut, d'un seul interrupteur : personne ne doit
   * recevoir de relance parce qu'un déploiement a eu lieu. Mettre à "true" en var
   * de Worker pour les activer.
   */
  PUSH_REMINDERS_ENABLED?: string;
  /**
   * Annonce quotidienne des anniversaires. Désactivée par défaut pour la même
   * raison que les rappels : rien ne doit partir du seul fait d'un déploiement.
   */
  PUSH_BIRTHDAYS_ENABLED?: string;
} & VapidEnv;

/** Doit rester identique aux entrées `triggers.crons` de wrangler.json. */
export const DISPATCH_CRON = '* * * * *';
export const DAILY_CRON = '0 7 * * *';
export const WEEKLY_CRON = '0 8 * * 1';

/** Rétention de l'historique des notifications, en jours. */
const HISTORY_RETENTION_DAYS = 90;

/**
 * Ancienneté au-delà de laquelle une commande en attente de paiement est relancée.
 *
 * Une commande validée le matin ne doit pas être relancée le soir : le délai laisse
 * le temps de passer au club régler son achat.
 */
const ORDER_REMINDER_AFTER_DAYS = 7;

async function sendUnpaidReminders(db: ReturnType<typeof createDb>, now: Date): Promise<void> {
  const result = await enqueueNotification(
    db,
    {
      title: 'Cotisation en attente',
      body: "Votre cotisation n'est pas encore soldée. Retrouvez le détail dans votre espace adhérent.",
      url: '/mon-compte',
      // Le ciblage adhérents est résolu ici : le domaine notifications reste feuille.
      target: { kind: 'emails', emails: await getHouseholdEmailsForActiveSeason(db, { unpaidOnly: true }) },
      targetLabel: 'unpaid',
      source: 'reminder:unpaid',
      category: 'reminder',
      // Un Cron Trigger peut être invoqué plus d'une fois pour la même échéance.
      skipIfSentSince: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000)
    },
    now
  );

  if (!result.skipped) {
    console.log(`[push] rappel cotisation : ${result.queued} appareil(s) en file`);
  }
}

/**
 * Relance les commandes boutique validées et toujours impayées.
 *
 * Le ciblage traverse deux domaines — les commandes viennent de `shop`, les adresses
 * de `members` — et se résout donc ici : le contexte notifications reste feuille et
 * ne reçoit qu'une liste d'emails.
 */
export async function sendAwaitingPaymentOrderReminders(
  db: ReturnType<typeof createDb>,
  now: Date
): Promise<void> {
  const cutoff = new Date(now.getTime() - ORDER_REMINDER_AFTER_DAYS * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  const orders = await getOrdersAwaitingPaymentSince(db, cutoff);
  if (orders.length === 0) return;

  const emails = await getContactEmailsForMembers(db, orders.map((order) => order.memberId));
  if (emails.length === 0) return;

  const result = await enqueueNotification(
    db,
    {
      title: 'Commande à régler',
      body: "Une commande boutique validée attend votre règlement. Retrouvez le détail dans votre espace adhérent.",
      url: '/mon-compte',
      target: { kind: 'emails', emails },
      targetLabel: 'emails',
      targetDetail: `${orders.length} commande(s) en attente de paiement`,
      source: 'reminder:order-awaiting-payment',
      category: 'reminder',
      // Un Cron Trigger peut être invoqué plus d'une fois pour la même échéance.
      skipIfSentSince: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000)
    },
    now
  );

  if (!result.skipped) {
    console.log(`[push] relance commandes : ${result.queued} appareil(s) en file`);
  }
}

/** Annonce les anniversaires du jour, si au moins un adhérent est concerné. */
async function sendBirthdayAnnouncements(db: ReturnType<typeof createDb>, now: Date): Promise<void> {
  const birthdays = await getBirthdaysForActiveSeason(db, now);
  if (birthdays.length === 0) return;

  const names = birthdays.map((b) => `${b.firstName} ${b.lastName} (${b.age} ans)`);
  // Au-delà de trois noms le corps deviendrait illisible sur un écran verrouillé.
  const body =
    names.length <= 3
      ? `Bon anniversaire à ${names.join(', ')} !`
      : `Bon anniversaire à ${names.slice(0, 3).join(', ')} et ${names.length - 3} autre(s) adhérent(s) !`;

  const result = await enqueueNotification(
    db,
    {
      title: birthdays.length > 1 ? 'Anniversaires du jour' : 'Anniversaire du jour',
      body,
      target: { kind: 'all' },
      source: 'birthday:daily',
      category: 'birthday',
      // Le cron quotidien peut être invoqué plusieurs fois pour la même échéance.
      skipIfSentSince: new Date(now.getTime() - 20 * 60 * 60 * 1000)
    },
    now
  );

  if (!result.skipped) {
    console.log(`[push] anniversaires : ${result.queued} appareil(s) en file`);
  }
}

export async function handleScheduled(
  event: { cron: string; scheduledTime: number },
  env: ScheduledBindings
): Promise<void> {
  if (!env?.DB) {
    console.error('[push] binding DB absent : cron ignoré');
    return;
  }

  const vapid = resolveVapid(env);
  if (!vapid) {
    console.error('[push] clés VAPID non configurées : aucun envoi possible');
    return;
  }

  const db = createDb(env.DB);
  const now = new Date(event.scheduledTime || Date.now());

  if (event.cron === DAILY_CRON && env.PUSH_BIRTHDAYS_ENABLED === 'true') {
    await sendBirthdayAnnouncements(db, now);
  }

  if (event.cron === WEEKLY_CRON) {
    if (env.PUSH_REMINDERS_ENABLED === 'true') {
      await sendUnpaidReminders(db, now);
      await sendAwaitingPaymentOrderReminders(db, now);
    }
    const purged = await purgeNotificationHistory(db, HISTORY_RETENTION_DAYS, now);
    if (purged > 0) {
      console.log(`[push] historique purgé : ${purged} message(s)`);
    }
  }

  // Toujours drainer la file, quel que soit le déclencheur : les rappels créés
  // juste au-dessus partent ainsi dès ce passage.
  const result = await dispatchPendingNotifications(db, vapid, {}, now);
  if (result.sent > 0 || result.failed > 0) {
    console.log(
      `[push] envoi : ${result.sent} ok, ${result.failed} en échec, ${result.pruned} abonnement(s) purgé(s), ${result.remaining} en attente`
    );
  }
}
