import { Type } from '@sinclair/typebox';

export const listExpensesQuerySchema = Type.Object({
  season: Type.Optional(Type.String()),
  status: Type.Optional(Type.String())
});
