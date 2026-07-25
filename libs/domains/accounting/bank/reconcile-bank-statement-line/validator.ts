import { Type } from '@sinclair/typebox';

const transactionDetailsSchema = Type.Object({
  seasonId: Type.String({ minLength: 1 }),
  type: Type.Union([Type.Literal('recette'), Type.Literal('depense'), Type.Literal('transfert')]),
  accountId: Type.Union([Type.Literal('current'), Type.Literal('savings'), Type.Literal('cash')]),
  destinationAccountId: Type.Optional(Type.Union([Type.Literal('current'), Type.Literal('savings'), Type.Literal('cash'), Type.Null()])),
  category: Type.Optional(Type.Union([Type.String(), Type.Number(), Type.Null()])),
  amount: Type.Number(),
  date: Type.String(),
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
