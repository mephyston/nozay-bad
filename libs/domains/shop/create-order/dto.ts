export interface CreateOrderInput {
  seasonId: string;
  memberId: number;
  productId: number;
  quantity: number;
  paymentMethod: string;
}

export type CreateOrderOutput = any;
