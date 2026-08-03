import { ordersTable, productsTable } from '../shared/schema';

export interface ListOrdersInput { seasonId?: number; status?: string; memberId?: number }

export type ListOrdersOutput = {
  order: typeof ordersTable.$inferSelect;
  member: { id: number; lastName: string; firstName: string; licence: string } | undefined;
  product: typeof productsTable.$inferSelect | undefined;
}[];
