export type OrderStatus = 'pending' | 'approved' | 'rejected';

export interface OrderData {
  id: number;
  seasonId: string;
  memberId: number;
  productId: number;
  quantity: number;
  totalAmount: number;
  paymentMethod: string;
  status: OrderStatus;
  transactionId: number | null;
  createdAt: Date;
}

export class Order {
  constructor(private readonly data: OrderData) {}

  get status(): OrderStatus {
    return this.data.status;
  }

  get seasonId(): string {
    return this.data.seasonId;
  }

  get productId(): number {
    return this.data.productId;
  }

  get memberId(): number {
    return this.data.memberId;
  }

  get quantity(): number {
    return this.data.quantity;
  }

  get totalAmount(): number {
    return this.data.totalAmount;
  }

  get paymentMethod(): string {
    return this.data.paymentMethod;
  }

  canBeApproved(): boolean {
    return this.data.status === 'pending';
  }

  canBeRejected(): boolean {
    return this.data.status === 'pending';
  }
}
