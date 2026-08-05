import { type Db } from '@nba/db';
import { StatsRepository, type NotificationStats, type RecentMessage } from './repository';

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
