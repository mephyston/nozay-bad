export interface Product {
  id: number;
  name: string;
  productCategoryId: number;
  priceCents: number;
  price?: number;
  stock: number;
  active: boolean;
  category?: string;
  createdAt?: string;
}
