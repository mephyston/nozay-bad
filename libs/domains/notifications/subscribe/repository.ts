import { type DbOrTx } from '@nba/db';
import { pushSubscriptionsTable } from '../shared/schema';
import type { SubscribeInput } from './dto';

export class SubscribeRepository {
  /**
   * Enregistre l'abonnement, ou le réaffecte s'il existe déjà.
   *
   * Le navigateur peut renvoyer le même endpoint après un changement de compte sur
   * l'appareil (foyer partagé, tablette familiale) : on écrase alors l'email pour
   * que les notifications suivent le compte réellement connecté.
   */
  async upsert(db: DbOrTx, input: SubscribeInput, now: Date): Promise<number> {
    const rows = await db
      .insert(pushSubscriptionsTable)
      .values({
        email: input.email,
        endpoint: input.endpoint,
        p256dh: input.p256dh,
        auth: input.auth,
        userAgent: input.userAgent ?? null,
        createdAt: now,
        lastSuccessAt: null
      })
      .onConflictDoUpdate({
        target: pushSubscriptionsTable.endpoint,
        set: {
          email: input.email,
          p256dh: input.p256dh,
          auth: input.auth,
          userAgent: input.userAgent ?? null
        }
      })
      .returning({ id: pushSubscriptionsTable.id });

    return rows[0].id;
  }
}
