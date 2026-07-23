import { Type } from '@sinclair/typebox';

export const deleteInvoiceParamSchema = Type.Object({
  id: Type.String({ pattern: '^[0-9]+$' })
});
