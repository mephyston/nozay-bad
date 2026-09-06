import { Type } from '@sinclair/typebox';

export const createTransactionSchema = Type.Object({
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
  date: Type.String({ minLength: 1 }),
  paymentMethod: Type.Union([
    Type.Literal('virement'),
    Type.Literal('cheque'),
    Type.Literal('especes'),
    Type.Literal('labaz'),
    Type.Literal('ancv'),
    Type.Literal('pass_sport'),
    Type.Literal('ticket_loisir'),
    Type.Literal('up_loisir')
  ]),
  description: Type.String(),
  reference: Type.Optional(Type.Union([Type.String(), Type.Null()]))
});
