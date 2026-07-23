import { ordersTable } from '../shared/schema';

export interface CreateOrderInput {
  seasonId: string;
  memberId: number;
  productId: number;
  quantity: number;
  paymentMethod: string;
}

export type CreateOrderOutput = typeof ordersTable.$inferSelect;
