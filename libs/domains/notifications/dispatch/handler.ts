import { type Db } from '@nba/db';
import { sendWebPush, type VapidKeys } from '@nba/push';
import { DispatchRepository } from './repository';
import type { DispatchInput, DispatchOutput } from './dto';

/**
 * Marge sous le plafond de 50 sous-requêtes par invocation du plan gratuit
 * Cloudflare : le reste de la file est traité au passage suivant du cron.
 */
const DEFAULT_LIMIT = 40;
/** Au-delà, la livraison est abandonnée : l'endpoint est durablement injoignable. */
const MAX_ATTEMPTS = 3;

/**
 * Draine la file d'envoi. Appelé par le Cron Trigger de `nba-api`, et manuellement
 * depuis l'admin pour ne pas attendre la minute suivante après une annonce.
 */
export async function dispatchPendingNotifications(
  db: Db,
  vapid: VapidKeys,
  input: DispatchInput = {},
  now: Date = new Date()
): Promise<DispatchOutput> {
  const repo = new DispatchRepository();
  const limit = Math.min(Math.max(input.limit ?? DEFAULT_LIMIT, 1), DEFAULT_LIMIT);

  const pending = await repo.findPending(db, limit);
  const sentIds: number[] = [];
  let failed = 0;
  let pruned = 0;

  for (const delivery of pending) {
    const payload = JSON.stringify({
      title: delivery.title,
      body: delivery.body,
      url: delivery.url ?? '/'
    });

    // `urgency: 'high'` n'est pas décoratif : sans cet en-tête, la RFC 8030 impose
    // `normal`, et Android garde alors le message en Doze jusqu'à ce que l'adhérent
    // ouvre l'app — elles arrivent toutes d'un coup. Chaque push d'ici affiche une
    // notification (`userVisibleOnly`), la haute priorité est donc légitime.
    const result = await sendWebPush(
      { endpoint: delivery.endpoint, p256dh: delivery.p256dh, auth: delivery.auth },
      payload,
      vapid,
      { urgency: 'high' }
    );

    if (result.ok) {
      sentIds.push(delivery.deliveryId);
      await repo.touchSubscription(db, delivery.subscriptionId, now);
      continue;
    }

    if (result.gone) {
      // L'utilisateur a désinstallé la PWA ou révoqué l'autorisation : l'endpoint
      // ne redeviendra jamais valide, on le retire au lieu de le réessayer.
      await repo.pruneSubscription(db, delivery.subscriptionId, now);
      pruned += 1;
      failed += 1;
      continue;
    }

    await repo.markRetryOrFailed(
      db,
      { id: delivery.deliveryId, attempts: delivery.attempts },
      result.error,
      MAX_ATTEMPTS,
      now
    );
    failed += 1;
  }

  await repo.markSent(db, sentIds, now);
  await repo.failOrphans(db, now);

  return { sent: sentIds.length, failed, pruned, remaining: await repo.countPending(db) };
}

/** Purge l'historique des messages au-delà de la durée de rétention. */
export async function purgeNotificationHistory(
  db: Db,
  retentionDays = 90,
  now: Date = new Date()
): Promise<number> {
  const repo = new DispatchRepository();
  return repo.purgeOlderThan(db, new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000));
}
