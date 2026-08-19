import { desc, eq, sql } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { pushDeliveriesTable, pushMessagesTable, pushSubscriptionsTable } from '../shared/schema';

export interface NotificationStats {
  /** Appareils abonnés. */
  devices: number;
  /** Comptes adhérents distincts couverts. */
  accounts: number;
  pending: number;
}

export interface RecentMessage {
  id: number;
  title: string;
  body: string;
  target: string;
  targetDetail: string | null;
  category: string;
  source: string;
  createdAt: Date;
  sent: number;
  failed: number;
  pending: number;
}

export interface SubscriberRow {
  id: number;
  email: string;
  userAgent: string | null;
  createdAt: Date;
  lastSuccessAt: Date | null;
}

export class StatsRepository {
  async summary(db: DbOrTx): Promise<NotificationStats> {
    const devices = await db
      .select({ count: sql<number>`count(*)`, accounts: sql<number>`count(distinct ${pushSubscriptionsTable.email})` })
      .from(pushSubscriptionsTable)
      .get();
    const pending = await db
      .select({ count: sql<number>`count(*)` })
      .from(pushDeliveriesTable)
      .where(eq(pushDeliveriesTable.status, 'pending'))
      .get();

    return {
      devices: Number(devices?.count ?? 0),
      accounts: Number(devices?.accounts ?? 0),
      pending: Number(pending?.count ?? 0)
    };
  }

  async recentMessages(db: DbOrTx, limit: number): Promise<RecentMessage[]> {
    const rows = await db
      .select({
        id: pushMessagesTable.id,
        title: pushMessagesTable.title,
        body: pushMessagesTable.body,
        target: pushMessagesTable.target,
        targetDetail: pushMessagesTable.targetDetail,
        category: pushMessagesTable.category,
        source: pushMessagesTable.source,
        createdAt: pushMessagesTable.createdAt,
        sent: sql<number>`sum(case when ${pushDeliveriesTable.status} = 'sent' then 1 else 0 end)`,
        failed: sql<number>`sum(case when ${pushDeliveriesTable.status} = 'failed' then 1 else 0 end)`,
        pending: sql<number>`sum(case when ${pushDeliveriesTable.status} = 'pending' then 1 else 0 end)`
      })
      .from(pushMessagesTable)
      .leftJoin(pushDeliveriesTable, eq(pushDeliveriesTable.messageId, pushMessagesTable.id))
      .groupBy(pushMessagesTable.id)
      .orderBy(desc(pushMessagesTable.id))
      .limit(limit)
      .all();

    return rows.map((row) => ({
      ...row,
      sent: Number(row.sent ?? 0),
      failed: Number(row.failed ?? 0),
      pending: Number(row.pending ?? 0)
    })) as RecentMessage[];
  }

  /** Abonnements, du plus récent au plus ancien. */
  async listSubscribers(db: DbOrTx): Promise<SubscriberRow[]> {
    const rows = await db
      .select({
        id: pushSubscriptionsTable.id,
        email: pushSubscriptionsTable.email,
        userAgent: pushSubscriptionsTable.userAgent,
        createdAt: pushSubscriptionsTable.createdAt,
        lastSuccessAt: pushSubscriptionsTable.lastSuccessAt
      })
      .from(pushSubscriptionsTable)
      .orderBy(desc(pushSubscriptionsTable.id))
      .all();
    return rows as SubscriberRow[];
  }
}
