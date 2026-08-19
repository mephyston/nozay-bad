import { productsTable } from '../shared/schema';

export type UpdateProductId = number;
export interface UpdateProductInput {
  name?: string;
  productCategoryId?: number;
  priceCents?: number;
  stock?: number;
  trackStock?: boolean;
  active?: boolean;
}

export type UpdateProductOutput = typeof productsTable.$inferSelect;
