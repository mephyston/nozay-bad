import { Type } from '@sinclair/typebox';

export const updateTransactionSchema = Type.Object({
  seasonId: Type.Union([Type.String({ minLength: 1 }), Type.Number()]),
  type: Type.Union([Type.Literal('recette'), Type.Literal('depense'), Type.Literal('transfert')]),
  accountId: Type.Union([Type.Literal('current'), Type.Literal('savings'), Type.Literal('cash')]),
  destinationAccountId: Type.Optional(Type.Union([Type.Literal('current'), Type.Literal('savings'), Type.Literal('cash'), Type.Null()])),
  category: Type.Optional(Type.Union([Type.String(), Type.Number(), Type.Null()])),
  amount: Type.Number(),
  date: Type.String(),
  paymentMethod: Type.String(),
  description: Type.String(),
  reference: Type.Optional(Type.Union([Type.String(), Type.Null()]))
});
