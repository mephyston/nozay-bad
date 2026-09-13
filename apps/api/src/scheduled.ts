import { createDb } from '@nba/db';
import { getClubFeatures, getClubSettings, localClock, type FeatureState } from '@nba/club/settings';
import { getSeasonAtDate, type SeasonRow } from '@nba/accounting-api';
import {
  getBirthdaysForActiveSeason,
  getContactEmailsForClubFunctions,
  getContactEmailsForLicences,
  getContactEmailsForMembers,
  getHouseholdEmailsForActiveSeason
} from '@nba/members-api';
import { getOrdersAwaitingPaymentSince } from '@nba/shop-api';
import { listOpenPlayOpeners, listOpenPlaySessions } from '@nba/schedules-api';
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
   * Interrupteur d'environnement des envois programmés.
   *
   * Ce qui part est décidé par le club (`club_features` : anniversaires, rappels) ;
   * cette variable dit seulement si **cet environnement** a le droit d'envoyer. Elle
   * est fausse en préproduction — sa base est un clone de la production, et ses
   * adhérents recevraient des rappels bien réels — et vraie en production. Fermé par
   * défaut : toute valeur autre que la chaîne `"true"` éteint, y compris l'absence.
   */
  SCHEDULED_SENDS_ENABLED?: string;
} & VapidEnv;

/*
 * Doit rester identique aux entrées `triggers.crons` de wrangler.json.
 *
 * **`wrangler.json` est du JSON strict** : `vitest.wrangler.ts` le passe à `JSON.parse` sans
 * dépouiller les commentaires, un `//` y casse donc toute la suite de tests. D'où cette note ici.
 *
 * Le plan gratuit plafonne le compte à 5 Cron Triggers. La production en consomme 3 ; **staging
 * n'en a aucun** (`crons: []`, le tableau vide est obligatoire : sans bloc `triggers` l'env hérite
 * des crons top-level). Le drain y a été rendu un temps (2026-08-27) puis retiré le 2026-09-06
 * pour libérer les emplacements. Conséquence à garder en tête : en staging, une notification
 * écrite dans `push_deliveries` n'est jamais envoyée toute seule ; rien ne le signale, et le
 * déclenchement métier passe pour cassé alors que seul le drainage manque.
 *
 * `handleScheduled` draine la file quel que soit le déclencheur : le cron quotidien et
 * l'hebdomadaire vident aussi ce qu'ils viennent d'y écrire.
 */
export const DISPATCH_CRON = '*/5 * * * *';
/*
 * Un tic par heure, et non plus un cron quotidien à 7 h UTC et un hebdomadaire le lundi
 * à 8 h : l'heure des envois est réglée par le club (`club_settings.daily_send_hour`,
 * `weekly_send_day`, `weekly_send_hour`) dans **son** fuseau. À chaque tic, le handler
 * regarde quelle heure il est chez le club et déroule ce qui est dû. Deux crons au lieu
 * de trois, sur les cinq que le plan gratuit accorde au compte.
 *
 * `MON` et non `1` reste la règle pour ce qui est écrit en jours : chez Cloudflare le jour
 * de la semaine va de 1 = dimanche à 7 = samedi, à rebours du cron Unix.
 */
export const HOURLY_CRON = '0 * * * *';

/** Rétention de l'historique des notifications, en jours. */
const HISTORY_RETENTION_DAYS = 90;

/**
 * Ancienneté au-delà de laquelle une commande en attente de paiement est relancée.
 *
 * Une commande validée le matin ne doit pas être relancée le soir : le délai laisse
 * le temps de passer au club régler son achat.
 */
const ORDER_REMINDER_AFTER_DAYS = 7;

/**
 * Horizon de l'appel aux ouvreurs, en jours.
 *
 * Une semaine : assez tôt pour qu'un bénévole s'organise, assez tard pour que l'affluence
 * soit connue. Au-delà, l'alerte partirait sur des séances encore vides qui trouveront
 * preneur d'elles-mêmes.
 */
const OPEN_PLAY_HORIZON_DAYS = 7;

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
  now: Date,
  afterDays: number = ORDER_REMINDER_AFTER_DAYS
): Promise<void> {
  const cutoff = new Date(now.getTime() - afterDays * 24 * 60 * 60 * 1000)
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

/**
 * Appelle les ouvreurs pour les séances qui cherchent encore preneur.
 *
 * La composition se fait ici, et non dans le domaine des créneaux : celui-ci est feuille
 * — il ne connaît ni les adhérents ni les notifications, et ne sait donc résoudre ni une
 * adresse ni un envoi. Il expose deux lectures, `apps/api` les croise. Même montage que
 * le rappel des classements.
 *
 * **Un seul message agrégé**, pas un par séance : trois notifications à sept heures du
 * matin font désinstaller l'application. Le détail se lit sur la page, que le message
 * ouvre.
 */
export async function sendOpenPlayOpenerReminders(
  db: ReturnType<typeof createDb>,
  season: SeasonRow,
  now: Date,
  parisToday: string
): Promise<void> {
  const { sessions } = await listOpenPlaySessions(
    db,
    // Plus de filtre de saison : une séance est une date, et la fenêtre de quelques jours
    // qui suit `parisToday` est déjà dans la saison en cours. Les ouvreurs, eux, restent
    // lus par saison — c'est leur mandat qui l'est.
    { from: parisToday, needsOpenerWithinDays: OPEN_PLAY_HORIZON_DAYS },
    now
  );
  if (sessions.length === 0) return;

  const openers = await listOpenPlayOpeners(db, { seasonCode: season.code });
  if (openers.length === 0) {
    console.log('[push] jeu libre : aucun ouvreur désigné, rien à envoyer');
    return;
  }

  const emails = await getContactEmailsForLicences(
    db,
    season.id,
    openers.map((opener) => opener.licence)
  );
  if (emails.length === 0) {
    console.log('[push] jeu libre : ouvreurs désignés sans adresse joignable');
    return;
  }

  // Deux séances au plus dans le corps : au-delà, l'écran verrouillé tronque et
  // n'apprend plus rien.
  const detail = sessions
    .slice(0, 2)
    .map((s) => `${s.date} ${s.startTime} (${s.playerCount} joueurs)`)
    .join(', ');

  const result = await enqueueNotification(
    db,
    {
      title: sessions.length > 1 ? 'Créneaux de jeu libre à pourvoir' : 'Créneau de jeu libre à pourvoir',
      body: `${sessions.length} séance${sessions.length > 1 ? 's ont' : ' a'} assez de joueurs mais personne pour ouvrir : ${detail}${sessions.length > 2 ? '…' : ''}.`,
      url: '/jeu-libre',
      target: { kind: 'emails', emails },
      targetLabel: 'emails',
      targetDetail: 'ouvreurs désignés',
      source: 'schedules:open-play-opener-reminder',
      category: 'open_play',
      // Un Cron Trigger peut être invoqué plus d'une fois pour la même échéance.
      skipIfSentSince: new Date(now.getTime() - 20 * 60 * 60 * 1000)
    },
    now
  );

  if (!result.skipped) {
    console.log(`[push] jeu libre : ${result.queued} appareil(s) en file pour ${sessions.length} séance(s)`);
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

  // Le déclencheur est reconnu à sa chaîne exacte. Un cron modifié à la main dans le
  // dashboard (« */30 * * * * » à la place de l'horaire, 09/2026) n'entre dans aucune
  // branche et tout se tait sans rien dire : le drain tourne, les envois programmés non.
  if (![DISPATCH_CRON, HOURLY_CRON].includes(event.cron)) {
    console.warn(`[push] cron inconnu « ${event.cron} » : aucune branche programmée, file drainée seulement`);
  }

  // Les envois programmés : ce que le club a gardé, sur un environnement qui a le
  // droit d'envoyer, à l'heure qu'il a réglée dans son fuseau. Le drain, lui, tourne
  // toujours — il ne crée rien, il expédie ce qu'une action métier a déjà mis en file.
  const sendsEnabled = env.SCHEDULED_SENDS_ENABLED === 'true';
  if (event.cron === HOURLY_CRON && sendsEnabled) {
    const [features, settings] = await Promise.all([getClubFeatures(db), getClubSettings(db)]);
    const on = (feature: keyof FeatureState) => features[feature] === true;
    const clock = localClock(now, settings.timezone);
    const dailyDue = clock.hour === settings.dailySendHour;
    const weeklyDue = clock.weekday === settings.weeklySendDay && clock.hour === settings.weeklySendHour;

    if (dailyDue) {
      if (on('birthdays')) {
        // Le jour civil du club, recalé en UTC : `getBirthdaysForActiveSeason` lit le
        // mois et le jour en UTC.
        const [y, m, d] = clock.date.split('-').map(Number);
        await sendBirthdayAnnouncements(db, new Date(Date.UTC(y, m - 1, d)));
      }

      // La saison se résout par la date, pas par le drapeau `active` : celui-ci est un
      // outil comptable, basculé quand la clôture l'arrange (cf. seasons/queries.ts).
      const season = await getSeasonAtDate(db, clock.date);
      if (season) {
        if (on('reminder_rankings')) {
          await sendRankingUpdateReminders(db, season, now, clock.date);
        }
        if (on('reminder_open_play')) {
          await sendOpenPlayOpenerReminders(db, season, now, clock.date);
        }
        if (on('reminder_lineups')) {
          const { reminded } = await remindMissingLineups(
            db,
            { seasonCode: season.code, parisNow: clock.dateTime },
            now
          );
          if (reminded.length > 0) {
            console.log(`[push] rappel compo : ${reminded.length} équipe(s) relancée(s)`);
          }
        }
      }
    }

    if (weeklyDue) {
      if (on('reminder_unpaid')) {
        await sendUnpaidReminders(db, now);
        await sendAwaitingPaymentOrderReminders(db, now, settings.unpaidReminderDelayDays);
      }
      const purged = await purgeNotificationHistory(db, HISTORY_RETENTION_DAYS, now);
      if (purged > 0) {
        console.log(`[push] historique purgé : ${purged} message(s)`);
      }
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
