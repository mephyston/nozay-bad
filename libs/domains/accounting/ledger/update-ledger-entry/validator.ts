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
  reference: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  /*
   * L'adhésion (`memberships.id`) à laquelle la recette se rattache. C'est elle que lisent la
   * fiche de l'adhérent et l'attestation : sans elle, une cotisation payée en espèces ou en
   * bons n'apparaît jamais comme réglée. Seuls le rapprochement et les chèques savaient la
   * poser ; le formulaire du grand livre — donc l'écran d'une caisse ou d'un compte de bons —
   * ne le pouvait pas. Contrôlée contre l'exercice par `assertMembershipMatchesSeason`.
   */
  memberId: Type.Optional(Type.Union([Type.Number(), Type.Null()]))
});
