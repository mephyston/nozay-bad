import { Type } from '@sinclair/typebox';

const transactionDetailsSchema = Type.Object({
  /**
   * Facultatif, et le plus souvent absent.
   *
   * L'exercice se déduit de la date de l'écriture — une saison est un intervalle. Seul le
   * rapprochement de facture le transmet encore, parce que la facture porte le sien.
   */
  seasonId: Type.Optional(Type.Union([Type.String({ minLength: 1 }), Type.Number()])),
  type: Type.Union([Type.Literal('recette'), Type.Literal('depense'), Type.Literal('transfert')]),
  accountId: Type.Union([Type.String(), Type.Number()]),
  destinationAccountId: Type.Optional(Type.Union([Type.String(), Type.Number(), Type.Null()])),
  category: Type.Optional(Type.Union([Type.String(), Type.Number(), Type.Null()])),
  amount: Type.Number(),
  date: Type.String(),
  paymentMethod: Type.Union([Type.String(), Type.Number()]),
  description: Type.String(),
  reference: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  accrualType: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  accrualNote: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  /**
   * L'adhérent et la facture se déclarent par **part**.
   *
   * Ils vivaient au niveau du corps, donc communs à toutes les écritures d'une ventilation : un
   * virement groupé réglant deux cotisations ne pouvait pas être ventilé correctement, et sur
   * plusieurs factures une seule était rattachée à une écriture. Les valeurs du corps restent
   * acceptées en repli, pour l'écriture unique.
   */
  memberId: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
  invoiceId: Type.Optional(Type.Union([Type.Number(), Type.Null()]))
});

export const reconcileBankTransactionSchema = Type.Object({
  memberId: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
  invoiceId: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
  invoiceIds: Type.Optional(Type.Union([Type.Array(Type.Number()), Type.Null()])),
  action: Type.Union([Type.Literal('match'), Type.Literal('create'), Type.Literal('reconcile')]),
  ledgerEntryId: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
  transactions: Type.Optional(Type.Union([Type.Array(transactionDetailsSchema), Type.Null()])),
  transaction: Type.Optional(transactionDetailsSchema)
});

export const reconcileBulkTransactionsSchema = Type.Object({
  requests: Type.Array(Type.Intersect([
    Type.Object({ btId: Type.Number() }),
    reconcileBankTransactionSchema
  ]))
});
