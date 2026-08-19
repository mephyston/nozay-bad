import { seasonsTable } from '@nba/accounting/schema';

export type ListSeasonsOutput = (typeof seasonsTable.$inferSelect)[];
