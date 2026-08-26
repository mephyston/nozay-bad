import { Type } from '@sinclair/typebox';

export const updateBankTransactionStatusParamSchema = Type.Object({
  id: Type.String({ pattern: '^[0-9]+$' })
});

export const updateBankTransactionStatusBulkSchema = Type.Object({
  ids: Type.Array(Type.Integer({ minimum: 1 }), { minItems: 1 }),
  status: Type.Union([Type.Literal('pending'), Type.Literal('ignored')])
});
