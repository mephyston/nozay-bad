import { and, eq, inArray, lt, or, sql } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { pushDeliveriesTable, pushMessagesTable, pushSubscriptionsTable } from '../shared/schema';

export interface PendingDelivery {
  deliveryId: number;
  attempts: number;
  subscriptionId: number;
  endpoint: string;
  p256dh: string;
  auth: string;
  title: string;
  body: string;
  url: string | null;
}

export class DispatchRepository {
  /**
   * Réserve un lot de livraisons pour ce passage, puis les rend jointes à leur
   * abonnement et à leur message.
   *
   * Deux drains tournent parfois en même temps (à l'heure pile, le cron horaire et
   * celui des cinq minutes ; ou le bouton de l'admin). Sans réservation, chacun lisait
   * les mêmes lignes `pending` et envoyait le message : les adhérents le recevaient
   * en double (09/11/2026). Le `UPDATE … RETURNING` est une seule instruction, que D1
   * sérialise : une ligne n'est rendue qu'à un seul passage.
   *
   * Une ligne restée `sending` au-delà de `staleBefore` (Worker coupé en route) est
   * reprise. Une livraison dont l'abonnement a disparu n'est pas réservée ; elle sera
   * soldée par `failOrphans`.
   */
  async claimPending(db: DbOrTx, limit: number, now: Date, staleBefore: Date): Promise<PendingDelivery[]> {
    const claimable = or(
      eq(pushDeliveriesTable.status, 'pending'),
      and(eq(pushDeliveriesTable.status, 'sending'), lt(pushDeliveriesTable.updatedAt, staleBefore))
    );
    const candidates = db
      .select({ id: pushDeliveriesTable.id })
      .from(pushDeliveriesTable)
      .innerJoin(pushSubscriptionsTable, eq(pushDeliveriesTable.subscriptionId, pushSubscriptionsTable.id))
      .where(claimable)
      .orderBy(pushDeliveriesTable.id)
      .limit(limit);
    const claimed = await db
      .update(pushDeliveriesTable)
      .set({ status: 'sending', updatedAt: now })
      .where(and(inArray(pushDeliveriesTable.id, candidates), claimable))
      .returning({ id: pushDeliveriesTable.id });
    if (claimed.length === 0) return [];

    const rows = await db
      .select({
        deliveryId: pushDeliveriesTable.id,
        attempts: pushDeliveriesTable.attempts,
        subscriptionId: pushSubscriptionsTable.id,
        endpoint: pushSubscriptionsTable.endpoint,
        p256dh: pushSubscriptionsTable.p256dh,
        auth: pushSubscriptionsTable.auth,
        title: pushMessagesTable.title,
        body: pushMessagesTable.body,
        url: pushMessagesTable.url
      })
      .from(pushDeliveriesTable)
      .innerJoin(pushSubscriptionsTable, eq(pushDeliveriesTable.subscriptionId, pushSubscriptionsTable.id))
      .innerJoin(pushMessagesTable, eq(pushDeliveriesTable.messageId, pushMessagesTable.id))
      .where(
        inArray(
          pushDeliveriesTable.id,
          claimed.map((row) => row.id)
        )
      )
      .orderBy(pushDeliveriesTable.id)
      .all();
    return rows as PendingDelivery[];
  }

  /** Ce qui reste à envoyer, réservé par un autre passage ou non. */
  async countPending(db: DbOrTx): Promise<number> {
    const row = await db
      .select({ count: sql<number>`count(*)` })
      .from(pushDeliveriesTable)
      .where(inArray(pushDeliveriesTable.status, ['pending', 'sending']))
      .get();
    return Number(row?.count ?? 0);
  }

  async markSent(db: DbOrTx, deliveryIds: number[], now: Date): Promise<void> {
    if (deliveryIds.length === 0) return;
    await db
      .update(pushDeliveriesTable)
      .set({ status: 'sent', attempts: sql`${pushDeliveriesTable.attempts} + 1`, updatedAt: now })
      .where(inArray(pushDeliveriesTable.id, deliveryIds))
      .run();
  }

  /**
   * Une livraison en échec est réessayée au prochain passage du cron, jusqu'à
   * `maxAttempts`. Au-delà elle passe en `failed` pour ne pas boucler indéfiniment.
   */
  async markRetryOrFailed(
    db: DbOrTx,
    delivery: { id: number; attempts: number },
    error: string,
    maxAttempts: number,
    now: Date
  ): Promise<void> {
    const nextAttempts = delivery.attempts + 1;
    await db
      .update(pushDeliveriesTable)
      .set({
        status: nextAttempts >= maxAttempts ? 'failed' : 'pending',
        attempts: nextAttempts,
        lastError: error.slice(0, 200),
        updatedAt: now
      })
      .where(eq(pushDeliveriesTable.id, delivery.id))
      .run();
  }

  /** Supprime un abonnement révoqué et solde les livraisons qui le visaient. */
  async pruneSubscription(db: DbOrTx, subscriptionId: number, now: Date): Promise<void> {
    await db.delete(pushSubscriptionsTable).where(eq(pushSubscriptionsTable.id, subscriptionId)).run();
    await db
      .update(pushDeliveriesTable)
      .set({ status: 'failed', lastError: 'Abonnement révoqué', updatedAt: now })
      .where(
        and(
          eq(pushDeliveriesTable.subscriptionId, subscriptionId),
          inArray(pushDeliveriesTable.status, ['pending', 'sending'])
        )
      )
      .run();
  }

  async touchSubscription(db: DbOrTx, subscriptionId: number, now: Date): Promise<void> {
    await db
      .update(pushSubscriptionsTable)
      .set({ lastSuccessAt: now })
      .where(eq(pushSubscriptionsTable.id, subscriptionId))
      .run();
  }

  /**
   * Solde les livraisons dont l'abonnement n'existe plus : la jointure interne de
   * `claimPending` les ignore, elles resteraient sinon en file pour toujours.
   */
  async failOrphans(db: DbOrTx, now: Date): Promise<void> {
    await db
      .update(pushDeliveriesTable)
      .set({ status: 'failed', lastError: 'Abonnement supprimé', updatedAt: now })
      .where(
        and(
          inArray(pushDeliveriesTable.status, ['pending', 'sending']),
          sql`${pushDeliveriesTable.subscriptionId} not in (select id from ${pushSubscriptionsTable})`
        )
      )
      .run();
  }

  /** Purge l'historique : les messages et livraisons antérieurs à `before`. */
  async purgeOlderThan(db: DbOrTx, before: Date): Promise<number> {
    const rows = await db
      .delete(pushMessagesTable)
      .where(lt(pushMessagesTable.createdAt, before))
      .returning({ id: pushMessagesTable.id });
    const ids = rows.map((row) => row.id);
    for (let i = 0; i < ids.length; i += 90) {
      await db
        .delete(pushDeliveriesTable)
        .where(inArray(pushDeliveriesTable.messageId, ids.slice(i, i + 90)))
        .run();
    }
    return ids.length;
  }
}
