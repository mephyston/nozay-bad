import { productsTable } from '../shared/schema';

export type UpdateProductId = number;

export interface UpdateProductInput {
  name?: string;
  productCategoryId?: number;
  priceCents?: number;
  stock?: number;
  trackStock?: boolean;
  active?: boolean;
  description?: string | null;
  /** `null` détache une déclinaison, qui redevient un produit à part entière. */
  parentId?: number | null;
  variantLabel?: string | null;
}

export type UpdateProductOutput = typeof productsTable.$inferSelect;
