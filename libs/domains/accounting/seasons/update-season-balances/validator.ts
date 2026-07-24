import { Type } from '@sinclair/typebox';

export const updateSeasonBalancesSchema = Type.Array(
  Type.Object({
    accountId: Type.Union([Type.Integer({ minimum: 1 }), Type.String()]),
    initialBalanceCents: Type.Optional(Type.Integer()),
    initialBalance: Type.Optional(Type.Number())
  })
);

