import { Type } from '@sinclair/typebox';

export const getInvoiceParamSchema = Type.Object({
  id: Type.String({ pattern: '^[0-9]+$' })
});
