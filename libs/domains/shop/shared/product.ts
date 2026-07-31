export type ProductCategory = 'shuttlecock' | 'string' | 'other';

export interface ProductData {
  id: number;
  name: string;
  category: ProductCategory;
  price: number;
  stock: number;
  trackStock: boolean;
  active: boolean;
  createdAt: Date;
}

export class Product {
  constructor(private readonly data: ProductData) {}

  get price(): number {
    return this.data.price;
  }

  get name(): string {
    return this.data.name;
  }
}
