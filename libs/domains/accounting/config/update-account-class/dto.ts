import { accountClassesTable } from '../../shared/schema';
export type UpdateAccountClassCode = string;
export interface UpdateAccountClassInput { label?: string; code?: string; type?: 'recette' | 'depense' | 'tresorerie' }
export type UpdateAccountClassOutput = typeof accountClassesTable.$inferSelect;
