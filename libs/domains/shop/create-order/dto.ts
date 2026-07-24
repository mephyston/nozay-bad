import { ordersTable } from '../shared/schema';

export interface CreateOrderInput {
  seasonId: number;
  memberId: number;
  productId: number;
  quantity: number;
  paymentMethodId: number;
}

export type CreateOrderOutput = typeof ordersTable.$inferSelect;
