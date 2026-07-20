export interface CreateProductInput {
  name: string;
  category: 'shuttlecock' | 'string' | 'other';
  price: number;
  stock: number;
  active?: boolean;
}

export type CreateProductOutput = any;
