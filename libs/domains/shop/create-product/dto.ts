import { productsTable } from '../shared/schema';

export interface CreateProductInput {
  /** Requis pour un produit à part entière ; une déclinaison prend celui de son parent. */
  name?: string;
  productCategoryId?: number;
  priceCents: number;
  stock?: number;
  trackStock?: boolean;
  active?: boolean;
  description?: string | null;
  /** Rattache le produit créé comme déclinaison de celui-ci ; `variantLabel` devient obligatoire. */
  parentId?: number | null;
  variantLabel?: string | null;
}

export type CreateProductOutput = typeof productsTable.$inferSelect;
