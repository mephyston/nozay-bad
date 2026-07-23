import { seasonsTable } from '../../shared/schema';
export type ListSeasonsOutput = (typeof seasonsTable.$inferSelect)[];
