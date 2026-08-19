import { and, eq, gte, inArray, notExists } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import {
  pushDeliveriesTable,
  pushMessagesTable,
  pushPreferencesTable,
  pushSubscriptionsTable
} from '../shared/schema';

export class EnqueueRepository {
  /**
   * Abonnements destinataires : tous, ou ceux des emails fournis.
   *
   * Les comptes ayant explicitement coupé la catégorie sont écartés. La condition
   * est formulée en `NOT EXISTS` parce que le réglage fonctionne par désabonnement :
   * l'immense majorité des comptes n'a aucune ligne de préférence et doit rester
   * destinataire.
   */
  async findSubscriptionIds(
    db: DbOrTx,
    options: { category: string; emails?: string[] }
  ): Promise<number[]> {
    const { category, emails } = options;
    if (emails && emails.length === 0) return [];

    const notOptedOut = notExists(
      db
        .select({ id: pushPreferencesTable.id })
        .from(pushPreferencesTable)
        .where(
          and(
            eq(pushPreferencesTable.email, pushSubscriptionsTable.email),
            eq(pushPreferencesTable.category, category),
            eq(pushPreferencesTable.enabled, false)
          )
        )
    );

    // D1 plafonne le nombre de paramètres liés par requête : on découpe la liste.
    if (emails) {
      const ids: number[] = [];
      const chunkSize = 80;
      for (let i = 0; i < emails.length; i += chunkSize) {
        const rows = await db
          .select({ id: pushSubscriptionsTable.id })
          .from(pushSubscriptionsTable)
          .where(
            and(inArray(pushSubscriptionsTable.email, emails.slice(i, i + chunkSize)), notOptedOut)
          )
          .all();
        ids.push(...rows.map((row) => row.id));
      }
      return ids;
    }

    const rows = await db
      .select({ id: pushSubscriptionsTable.id })
      .from(pushSubscriptionsTable)
      .where(notOptedOut)
      .all();
    return rows.map((row) => row.id);
  }

  /** Un message de cette origine a-t-il déjà été créé depuis `since` ? */
  async hasRecentMessage(db: DbOrTx, source: string, since: Date): Promise<boolean> {
    const row = await db
      .select({ id: pushMessagesTable.id })
      .from(pushMessagesTable)
      .where(and(eq(pushMessagesTable.source, source), gte(pushMessagesTable.createdAt, since)))
      .get();
    return row !== undefined;
  }

  async createMessage(
    db: DbOrTx,
    message: {
      title: string;
      body: string;
      url: string | null;
      target: 'all' | 'unpaid' | 'groups' | 'emails';
      targetDetail: string | null;
      source: string;
      category: string;
    },
    now: Date
  ): Promise<number> {
    const rows = await db
      .insert(pushMessagesTable)
      .values({ ...message, createdAt: now })
      .returning({ id: pushMessagesTable.id });
    return rows[0].id;
  }

  async createDeliveries(db: DbOrTx, messageId: number, subscriptionIds: number[], now: Date): Promise<number> {
    let inserted = 0;
    // D1 plafonne à 100 paramètres liés par requête et chaque ligne en consomme 5 :
    // au-delà de 20 lignes par insert, D1 répond « too many SQL variables ».
    const chunkSize = 15;
    for (let i = 0; i < subscriptionIds.length; i += chunkSize) {
      const values = subscriptionIds.slice(i, i + chunkSize).map((subscriptionId) => ({
        messageId,
        subscriptionId,
        status: 'pending' as const,
        attempts: 0,
        updatedAt: now
      }));
      await db.insert(pushDeliveriesTable).values(values).run();
      inserted += values.length;
    }
    return inserted;
  }
}
