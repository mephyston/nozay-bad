import { and, eq, inArray, lt, sql } from 'drizzle-orm';
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
   * Livraisons à traiter, jointes à leur abonnement et à leur message.
   *
   * Une livraison dont l'abonnement a disparu entre-temps est écartée par la
   * jointure interne ; elle sera nettoyée par `failOrphans`.
   */
  async findPending(db: DbOrTx, limit: number): Promise<PendingDelivery[]> {
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
      .where(eq(pushDeliveriesTable.status, 'pending'))
      .orderBy(pushDeliveriesTable.id)
      .limit(limit)
      .all();
    return rows as PendingDelivery[];
  }

  async countPending(db: DbOrTx): Promise<number> {
    const row = await db
      .select({ count: sql<number>`count(*)` })
      .from(pushDeliveriesTable)
      .where(eq(pushDeliveriesTable.status, 'pending'))
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
          eq(pushDeliveriesTable.status, 'pending')
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
   * `findPending` les ignore, elles resteraient sinon `pending` pour toujours.
   */
  async failOrphans(db: DbOrTx, now: Date): Promise<void> {
    await db
      .update(pushDeliveriesTable)
      .set({ status: 'failed', lastError: 'Abonnement supprimé', updatedAt: now })
      .where(
        and(
          eq(pushDeliveriesTable.status, 'pending'),
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
