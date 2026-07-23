import { accountClassesTable } from '../../shared/schema';
export type UpdateAccountClassCode = string;
export interface UpdateAccountClassInput { label: string }
export type UpdateAccountClassOutput = typeof accountClassesTable.$inferSelect;
