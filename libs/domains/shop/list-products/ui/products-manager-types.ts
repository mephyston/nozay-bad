export interface Product {
  id: number;
  name: string;
  productCategoryId: number;
  priceCents: number;
  price?: number;
  stock: number;
  trackStock?: boolean;
  active: boolean;
  category?: string;
  createdAt?: string;
}
