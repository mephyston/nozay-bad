import { Type } from '@sinclair/typebox';

export const changeInvoiceStatusSchema = Type.Object({
  status: Type.Union([
    Type.Literal('draft'),
    Type.Literal('sent'),
    Type.Literal('paid'),
    Type.Literal('cancelled')
  ])
});
