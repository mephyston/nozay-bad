import { createDb } from '@nba/db';
import { getSeasonAtDate, type SeasonRow } from '@nba/accounting-api';
import {
  getBirthdaysForActiveSeason,
  getContactEmailsForClubFunctions,
  getContactEmailsForMembers,
  getHouseholdEmailsForActiveSeason
} from '@nba/members-api';
import { getOrdersAwaitingPaymentSince } from '@nba/shop-api';
import { findRankingReminderDays, remindMissingLineups } from '@nba/teams-api';
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
  /**
   * Rappel « classements à mettre à jour » aux fonctions du club, le jeudi précédant
   * une journée d'interclubs régional. Désactivé par défaut, comme les autres.
   */
  PUSH_RANKING_REMINDERS_ENABLED?: string;
  /**
   * Relance des capitaines dont la composition n'est pas validée à l'approche d'une
   * journée d'interclubs. Désactivée par défaut, comme les autres.
   */
  PUSH_LINEUP_REMINDERS_ENABLED?: string;
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

/**
 * Instant courant en heure de Paris, `YYYY-MM-DDTHH:mm`.
 *
 * Le cron tourne en UTC ; les dates du domaine interclubs (`week_start`, `played_at`)
 * sont des heures locales naïves. `en-CA` rend la date en ISO, un découpage sûr —
 * même recette que `parisCalendarDay` dans `members/list-birthdays/route.ts`.
 */
function parisNow(now: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}

/**
 * Rappelle aux fonctions du club (bureau, CA, entraîneurs) d'importer les classements
 * le jeudi où se fige le classement de référence d'une journée d'interclubs régional.
 *
 * Le ciblage croise deux domaines — les journées viennent de `teams`, les adresses des
 * fonctions de `members` — et se résout donc ici, comme les autres rappels : le
 * contexte notifications reste feuille.
 */
export async function sendRankingUpdateReminders(
  db: ReturnType<typeof createDb>,
  season: SeasonRow,
  now: Date,
  parisToday: string
): Promise<void> {
  const days = await findRankingReminderDays(db, season.code, parisToday);
  if (days.length === 0) return;

  const emails = await getContactEmailsForClubFunctions(db, season.id);
  if (emails.length === 0) {
    console.log('[push] rappel classements : aucune fonction du club renseignée, rien à envoyer');
    return;
  }

  for (const day of days) {
    const dayLabel = day.dayLabel ?? `J${day.dayNumber}`;
    const result = await enqueueNotification(
      db,
      {
        title: 'Classements à mettre à jour',
        body: `${dayLabel} ${day.championshipLabel} la semaine prochaine : le classement de référence est celui publié ce jeudi. Exportez les classements depuis Poona et importez-les dans l'admin (Équipes → Classements → Importer).`,
        target: { kind: 'emails', emails },
        targetLabel: 'emails',
        targetDetail: 'fonctions du club',
        source: `teams:ranking-reminder:${day.championship}:J${day.dayNumber}`,
        category: 'interclubs',
        // Un Cron Trigger peut être invoqué plus d'une fois pour la même échéance.
        skipIfSentSince: new Date(now.getTime() - 20 * 60 * 60 * 1000)
      },
      now
    );
    if (!result.skipped) {
      console.log(`[push] rappel classements ${dayLabel} : ${result.queued} appareil(s) en file`);
    }
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

  if (event.cron === DAILY_CRON) {
    if (env.PUSH_BIRTHDAYS_ENABLED === 'true') {
      await sendBirthdayAnnouncements(db, now);
    }

    const paris = parisNow(now);
    const parisToday = paris.slice(0, 10);
    // La saison se résout par la date, pas par le drapeau `active` : celui-ci est un
    // outil comptable, basculé quand la clôture l'arrange (cf. seasons/queries.ts).
    const season = await getSeasonAtDate(db, parisToday);
    if (season) {
      if (env.PUSH_RANKING_REMINDERS_ENABLED === 'true') {
        await sendRankingUpdateReminders(db, season, now, parisToday);
      }
      if (env.PUSH_LINEUP_REMINDERS_ENABLED === 'true') {
        const { reminded } = await remindMissingLineups(
          db,
          { seasonCode: season.code, parisNow: paris },
          now
        );
        if (reminded.length > 0) {
          console.log(`[push] rappel compo : ${reminded.length} équipe(s) relancée(s)`);
        }
      }
    }
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
