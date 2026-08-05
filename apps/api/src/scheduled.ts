import { createDb } from '@nba/db';
import { getHouseholdEmailsForActiveSeason } from '@nba/members-api';
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
   * Rappels automatiques de cotisation. Désactivés par défaut : personne ne doit
   * recevoir de relance parce qu'un déploiement a eu lieu. Mettre à "true" en var
   * de Worker pour les activer.
   */
  PUSH_REMINDERS_ENABLED?: string;
} & VapidEnv;

/** Doit rester identique aux entrées `triggers.crons` de wrangler.json. */
export const DISPATCH_CRON = '* * * * *';
export const WEEKLY_CRON = '0 8 * * 1';

/** Rétention de l'historique des notifications, en jours. */
const HISTORY_RETENTION_DAYS = 90;

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
      // Un Cron Trigger peut être invoqué plus d'une fois pour la même échéance.
      skipIfSentSince: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000)
    },
    now
  );

  if (!result.skipped) {
    console.log(`[push] rappel cotisation : ${result.queued} appareil(s) en file`);
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

  if (event.cron === WEEKLY_CRON) {
    if (env.PUSH_REMINDERS_ENABLED === 'true') {
      await sendUnpaidReminders(db, now);
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
