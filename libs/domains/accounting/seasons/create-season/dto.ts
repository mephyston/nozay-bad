import { seasonsTable } from '../../shared/schema';
export interface CreateSeasonInput { id: string; name: string; active?: boolean }
export type CreateSeasonOutput = typeof seasonsTable.$inferSelect;
