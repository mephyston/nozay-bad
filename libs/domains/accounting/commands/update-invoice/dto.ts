export type UpdateInvoiceId = number;
export interface UpdateInvoiceInput {
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

export type UpdateInvoiceOutput = any;
