import { accountClassesTable } from '../../shared/schema';
export interface CreateAccountClassInput { code: string; label: string; type?: 'recette' | 'depense' | 'tresorerie' }
export type CreateAccountClassOutput = typeof accountClassesTable.$inferSelect;
