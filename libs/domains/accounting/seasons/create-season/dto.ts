import { seasonsTable } from '../../shared/schema';
export interface CreateSeasonInput { id?: string; code?: string; name: string; startDate?: string; endDate?: string; active?: boolean }
export type CreateSeasonOutput = typeof seasonsTable.$inferSelect;
