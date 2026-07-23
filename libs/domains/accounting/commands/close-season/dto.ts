import { seasonsTable } from '../../shared/schema';
export type CloseSeasonInput = string;
export type CloseSeasonOutput = typeof seasonsTable.$inferSelect;
