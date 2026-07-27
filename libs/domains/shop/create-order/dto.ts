import { ordersTable } from '../shared/schema';

export interface CreateOrderInput {
  seasonId: number;
  memberId: number;
  productId: number;
  quantity: number;
  paymentMethod: string;
  paidAt?: string;
}

export type CreateOrderOutput = typeof ordersTable.$inferSelect;
