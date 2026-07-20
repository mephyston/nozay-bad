export interface ListProductsRepositoryInterface {
  list(db: any, filters: { category?: string; active?: boolean }): Promise<any[]>;
}

export interface CreateProductRepositoryInterface {
  create(db: any, values: {
    name: string;
    category: 'shuttlecock' | 'string' | 'other';
    price: number;
    stock: number;
    active: boolean;
    createdAt: Date;
  }): Promise<any>;
}

export interface UpdateProductRepositoryInterface {
  update(db: any, id: number, values: {
    name?: string;
    price?: number;
    stock?: number;
    active?: boolean;
  }): Promise<any | undefined>;
}

export interface ListOrdersRepositoryInterface {
  list(db: any, filters: { season?: string; status?: string }): Promise<any[]>;
  getMembersByIds(db: any, ids: number[]): Promise<any[]>;
  getProductsByIds(db: any, ids: number[]): Promise<any[]>;
}

export interface CreateOrderRepositoryInterface {
  getProductById(db: any, id: number): Promise<any | undefined>;
  create(db: any, values: {
    seasonId: string;
    memberId: number;
    productId: number;
    quantity: number;
    totalAmount: number;
    paymentMethod: string;
    status: 'pending';
    createdAt: Date;
  }): Promise<any>;
}

export interface ApproveOrderRepositoryInterface {
  getOrderById(db: any, id: number): Promise<any | undefined>;
  getMemberById(db: any, id: number): Promise<any | undefined>;
  getProductById(db: any, id: number): Promise<any | undefined>;
  getBoutiqueCategory(db: any): Promise<number | null>;
  createRecetteTransaction(db: any, values: {
    seasonId: string;
    category: number | null;
    amount: number;
    description: string;
    memberId: number;
    paymentMethod: string;
  }): Promise<{ id: number }>;
  approveWithLock(db: any, id: number, transactionId: number): Promise<any | undefined>;
}

export interface RejectOrderRepositoryInterface {
  getOrderById(db: any, id: number): Promise<any | undefined>;
  rejectWithLock(db: any, id: number): Promise<any | undefined>;
}
