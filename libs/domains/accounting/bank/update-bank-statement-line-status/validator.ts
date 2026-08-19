import { Type } from '@sinclair/typebox';

export const updateBankTransactionStatusParamSchema = Type.Object({
  id: Type.String({ pattern: '^[0-9]+$' })
});
