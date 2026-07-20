export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'cancelled';

export interface InvoiceData {
  id: number;
  invoiceNumber: string;
  seasonId: string;
  date: string;
  dueDate: string;
  clientName: string;
  clientAddress: string | null;
  clientEmail: string | null;
  subject: string | null;
  location: string | null;
  period: string | null;
  attendees: string | null;
  totalAmount: number;
  status: InvoiceStatus;
  createdAt: Date;
}

export class Invoice {
  constructor(private readonly data: InvoiceData) {}

  get id(): number {
    return this.data.id;
  }

  get invoiceNumber(): string {
    return this.data.invoiceNumber;
  }

  get seasonId(): string {
    return this.data.seasonId;
  }

  get status(): InvoiceStatus {
    return this.data.status;
  }

  get totalAmount(): number {
    return this.data.totalAmount;
  }

  canBeEdited(isSeasonClosed: boolean): boolean {
    return this.data.status === 'draft' && !isSeasonClosed;
  }

  canBeDeleted(isSeasonClosed: boolean): boolean {
    return (this.data.status === 'draft' || this.data.status === 'cancelled') && !isSeasonClosed;
  }
}
