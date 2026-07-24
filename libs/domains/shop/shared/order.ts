export type OrderStatus = 'pending' | 'approved' | 'rejected';

export interface OrderData {
  id: number;
  seasonId: number;
  memberId: number;
  productId: number;
  quantity: number;
  totalAmountCents: number;
  paymentMethodId: number;
  status: OrderStatus;
  ledgerEntryId: number | null;
  createdAt: Date;
}

export class Order {
  constructor(private readonly data: OrderData) {}

  get id(): number {
    return this.data.id;
  }

  get status(): OrderStatus {
    return this.data.status;
  }

  get seasonId(): number {
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

  get totalAmountCents(): number {
    return this.data.totalAmountCents;
  }

  get paymentMethodId(): number {
    return this.data.paymentMethodId;
  }

  canBeApproved(): boolean {
    return this.data.status === 'pending';
  }

  canBeRejected(): boolean {
    return this.data.status === 'pending';
  }
}
