export interface CreateInvoiceInput {
  seasonId: string;
  date: string;
  dueDate: string;
  clientName: string;
  clientAddress?: string;
  clientEmail?: string;
  subject?: string;
  location?: string;
  period?: string;
  attendees?: string;
  totalAmount: number;
  items?: { description: string; quantity: number; unitPrice: number }[];
}

export type CreateInvoiceOutput = any;
