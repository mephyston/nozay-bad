import { Type } from '@sinclair/typebox';

export const updateSeasonBalancesSchema = Type.Array(
  Type.Object({
    accountId: Type.Union([Type.Literal('current'), Type.Literal('savings'), Type.Literal('cash')]),
    initialBalance: Type.Number()
  })
);
