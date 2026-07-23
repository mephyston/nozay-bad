import { accountClassesTable } from '../../shared/schema';
export interface CreateAccountClassInput { code: string; label: string }
export type CreateAccountClassOutput = typeof accountClassesTable.$inferSelect;
