import { Type } from '@sinclair/typebox';

export const updateSeasonBalancesSchema = Type.Array(
  Type.Object({
    accountId: Type.Integer({ minimum: 1 }),
    initialBalanceCents: Type.Integer()
  })
);

