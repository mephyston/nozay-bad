import { type Db } from '@nba/db';
import {
  StatsRepository,
  type NotificationStats,
  type RecentMessage,
  type SubscriberRow
} from './repository';

export interface NotificationOverview {
  stats: NotificationStats;
  messages: RecentMessage[];
}

export async function getNotificationOverview(db: Db, limit = 20): Promise<NotificationOverview> {
  const repo = new StatsRepository();
  return {
    stats: await repo.summary(db),
    messages: await repo.recentMessages(db, limit)
  };
}

/**
 * Abonnements bruts. L'identité des adhérents correspondants est ajoutée par
 * `apps/api` : la rattacher ici ferait dépendre le contexte du domaine adhérents.
 */
export async function getNotificationSubscribers(db: Db): Promise<SubscriberRow[]> {
  const repo = new StatsRepository();
  return repo.listSubscribers(db);
}
