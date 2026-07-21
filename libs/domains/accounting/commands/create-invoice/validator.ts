import { Type } from '@sinclair/typebox';

export const createInvoiceSchema = Type.Object({
  seasonId: Type.String({ minLength: 1 }),
  date: Type.String({ minLength: 1 }),
  dueDate: Type.String({ minLength: 1 }),
  clientName: Type.String({ minLength: 1 }),
  clientAddress: Type.Optional(Type.String()),
  clientEmail: Type.Optional(Type.String()),
  subject: Type.Optional(Type.String()),
  location: Type.Optional(Type.String()),
  period: Type.Optional(Type.String()),
  attendees: Type.Optional(Type.String()),
  totalAmount: Type.Number(),
  items: Type.Optional(Type.Array(Type.Object({
    description: Type.String({ minLength: 1 }),
    quantity: Type.Number(),
    unitPrice: Type.Number()
  })))
});
