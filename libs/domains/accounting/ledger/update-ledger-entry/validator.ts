import { Type } from '@sinclair/typebox';

export const updateTransactionSchema = Type.Object({
  seasonId: Type.Union([Type.String({ minLength: 1 }), Type.Number()]),
  type: Type.Union([Type.Literal('recette'), Type.Literal('depense'), Type.Literal('transfert')]),
  /*
   * Un code de compte, et non plus une union figée de trois codes : les comptes sont des
   * données (`accounts`), et le handler les résout par `resolveAccountId`, qui refuse un code
   * inconnu. Le porte-monnaie Badnet est le premier compte ajouté après le seed.
   */
  accountId: Type.String({ minLength: 1 }),
  destinationAccountId: Type.Optional(Type.Union([Type.String({ minLength: 1 }), Type.Null()])),
  category: Type.Optional(Type.Union([Type.String(), Type.Number(), Type.Null()])),
  amount: Type.Number(),
  date: Type.String(),
  paymentMethod: Type.String(),
  description: Type.String(),
  reference: Type.Optional(Type.Union([Type.String(), Type.Null()]))
});
