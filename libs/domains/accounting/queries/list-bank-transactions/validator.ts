import { Type } from '@sinclair/typebox';

export const listBankTransactionsQuerySchema = Type.Object({
  season: Type.String({ minLength: 1 }),
  status: Type.Optional(Type.String()),
  accountId: Type.Optional(Type.String())
});
