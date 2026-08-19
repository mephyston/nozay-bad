import { type Db } from '@nba/db';
import { normalizeEmail } from '../shared/vapid';
import { EnqueueRepository } from './repository';
import type { EnqueueNotificationInput, EnqueueNotificationOutput } from './dto';
import type { NotificationCategory } from '../shared/categories';

/**
 * Met une notification en file d'attente.
 *
 * Aucun appel réseau n'est fait ici : l'envoi effectif est réalisé par
 * `dispatchPendingNotifications`, appelé par le Cron Trigger. Une diffusion à tout
 * le club dépasserait sinon le plafond de sous-requêtes d'une invocation de Worker,
 * et une notification perdue le resterait faute de réessai.
 */
export async function enqueueNotification(
  db: Db,
  input: EnqueueNotificationInput,
  now: Date = new Date()
): Promise<EnqueueNotificationOutput> {
  const repo = new EnqueueRepository();
  const source = input.source ?? 'admin';
  const category = input.category ?? 'announcement';

  if (input.skipIfSentSince && (await repo.hasRecentMessage(db, source, input.skipIfSentSince))) {
    return { messageId: 0, queued: 0, skipped: true };
  }

  const subscriptionIds =
    input.target.kind === 'all'
      ? await repo.findSubscriptionIds(db, { category })
      : await repo.findSubscriptionIds(db, {
          category,
          emails: [...new Set(input.target.emails.map(normalizeEmail).filter(Boolean))]
        });

  const messageId = await repo.createMessage(
    db,
    {
      title: input.title,
      body: input.body,
      url: input.url ?? null,
      target: input.targetLabel ?? input.target.kind,
      targetDetail: input.targetDetail ?? null,
      source,
      category
    },
    now
  );

  // Le message est enregistré même sans destinataire : il reste tracé dans
  // l'historique et l'émetteur voit qu'il n'a touché personne.
  const queued = await repo.createDeliveries(db, messageId, subscriptionIds, now);

  return { messageId, queued };
}

/**
 * Notifie les contacts d'un adhérent à la suite d'un événement métier.
 *
 * N'échoue jamais : une notification est un effet de bord du traitement métier, elle
 * ne doit pas faire échouer la validation d'une note de frais ou d'une commande.
 * L'appelant résout les emails (adhérent + représentants légaux) : c'est lui qui
 * connaît le domaine adhérents.
 */
export async function notifyContacts(
  db: Db,
  emails: string[],
  message: { title: string; body: string; url?: string; source: string; category: NotificationCategory },
  now: Date = new Date()
): Promise<void> {
  if (emails.length === 0) return;

  try {
    await enqueueNotification(db, { ...message, target: { kind: 'emails', emails } }, now);
  } catch (error) {
    console.error('[push] notification métier non envoyée :', (error as Error)?.message || error);
  }
}
