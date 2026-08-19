export interface InvoiceItem {
  id?: number;
  invoiceId?: number;
  description: string;
  quantity: number;
  unitPrice: number; // in cents
  totalPrice?: number; // in cents
}

export interface Invoice {
  id: number;
  invoiceNumber: string;
  seasonId: string;
  date: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  clientName: string;
  clientAddress: string | null;
  clientEmail: string | null;
  subject: string | null;
  location: string | null;
  period: string | null;
  attendees: string | null;
  status: 'draft' | 'sent' | 'paid' | 'cancelled';
  totalAmount: number; // in cents
  createdAt: string;
  items?: InvoiceItem[];
}

export interface Season {
  id: string;
  name: string;
  active: boolean;
  closed?: boolean;
}

export interface InvoiceFormItem {
  description: string;
  quantity: number;
  unitPriceStr: string;
}
