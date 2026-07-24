import { productsTable } from '../shared/schema';

export interface CreateProductInput {
  name: string;
  productCategoryId: number;
  priceCents: number;
  stock?: number;
  active?: boolean;
}

export type CreateProductOutput = typeof productsTable.$inferSelect;
