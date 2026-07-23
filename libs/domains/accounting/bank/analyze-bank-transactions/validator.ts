import { Type } from '@sinclair/typebox';

export const analyzeBankTransactionsQuerySchema = Type.Object({
  season: Type.String({ minLength: 1 }),
  id: Type.Optional(Type.String())
});
