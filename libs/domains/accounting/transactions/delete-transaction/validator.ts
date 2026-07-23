import { Type } from '@sinclair/typebox';

export const deleteTransactionParamSchema = Type.Object({
  id: Type.String({ pattern: '^[0-9]+$' })
});
