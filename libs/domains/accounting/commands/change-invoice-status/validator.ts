import { Type } from '@sinclair/typebox';

export const changeInvoiceStatusSchema = Type.Object({
  status: Type.String({ minLength: 1 })
});

