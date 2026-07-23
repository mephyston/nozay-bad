import { Type } from '@sinclair/typebox';

export const updateTransactionSchema = Type.Object({
  seasonId: Type.String({ minLength: 1 }),
  type: Type.Union([Type.Literal('recette'), Type.Literal('depense'), Type.Literal('transfert')]),
  accountId: Type.Union([Type.Literal('current'), Type.Literal('savings'), Type.Literal('cash')]),
  destinationAccountId: Type.Optional(Type.Union([Type.Literal('current'), Type.Literal('savings'), Type.Literal('cash')])),
  category: Type.Optional(Type.Union([Type.String(), Type.Number()])),
  amount: Type.Number(),
  date: Type.String(),
  paymentMethod: Type.String(),
  description: Type.String(),
  reference: Type.Optional(Type.String())
});
