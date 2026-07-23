import { seasonsTable } from '../../shared/schema';
export type UpdateSeasonId = string;
export interface UpdateSeasonInput { name?: string; active?: boolean }
export type UpdateSeasonOutput = typeof seasonsTable.$inferSelect;
