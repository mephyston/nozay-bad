import { Type } from '@sinclair/typebox';

export const listTransactionsQuerySchema = Type.Object({
  season: Type.Optional(Type.String()),
  unreconciledCheques: Type.Optional(Type.Union([Type.Literal('true'), Type.Literal('false')])),
  page: Type.Optional(Type.String({ pattern: '^[0-9]+$' })),
  limit: Type.Optional(Type.String({ pattern: '^[0-9]+$' })),
  accountId: Type.Optional(Type.String()),
  type: Type.Optional(Type.String()),
  category: Type.Optional(Type.String()),
  classCode: Type.Optional(Type.String()),
  memberId: Type.Optional(Type.String()),
  month: Type.Optional(Type.String()),
  search: Type.Optional(Type.String()),
  runningBalance: Type.Optional(Type.Union([Type.Literal('0'), Type.Literal('1'), Type.Literal('true'), Type.Literal('false')]))
});
