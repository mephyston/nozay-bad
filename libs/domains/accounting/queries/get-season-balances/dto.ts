import { seasonBalancesTable } from '../../shared/schema';
export type GetSeasonBalancesInput = string;
export type GetSeasonBalancesOutput = (typeof seasonBalancesTable.$inferSelect)[];
